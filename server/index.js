process.env.DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1/open5gs';

const NF_FILES = {
  nrf: 'nrf.yaml', scp: 'scp.yaml', amf: 'amf.yaml',
  smf: 'smf.yaml', upf: 'upf.yaml', ausf: 'ausf.yaml',
  udm: 'udm.yaml', udr: 'udr.yaml', pcf: 'pcf.yaml',
  nssf: 'nssf.yaml', bsf: 'bsf.yaml', mme: 'mme.yaml',
  hss: 'hss.yaml', sgwc: 'sgwc.yaml', sgwu: 'sgwu.yaml',
  pcrf: 'pcrf.yaml', sepp1: 'sepp1.yaml', sepp2: 'sepp2.yaml'
};
const YAML_BASE = process.env.YAML_CONFIG_PATH || '/etc/open5gs';

const _hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 9999;
const dev = process.env.NODE_ENV !== 'production';

const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const csrf = require('lusca').csrf();
const path = require('path');
const yaml = require('js-yaml');
const fsModule = require('fs');
const pathModule = require('path');

require('./ensure-secret')();
const secret = process.env.SECRET_KEY;
const api = require('./routes');
const Account = require('./models/account.js');

const server = express();

mongoose.Promise = global.Promise;
if (dev) mongoose.set('debug', true);

mongoose.connect(process.env.DB_URI, {
  serverSelectionTimeoutMS: 1000
}).then(db => {
  if (dev) {
    Account.countDocuments().then(count => {
      if (!count) {
        const newAccount = new Account();
        newAccount.username = 'admin';
        newAccount.roles = ['admin'];
        Account.register(newAccount, '1423', err => {
          if (err) console.error(err);
        });
      }
    }).catch(err => console.error(err));
  }

  // Auto-import YAML configs to MongoDB on startup
  const NfConfig = require('./models/nf-config');

  async function initNfConfigs() {
    for (const [nfType, filename] of Object.entries(NF_FILES)) {
      const yamlPath = pathModule.join(YAML_BASE, filename);
      if (fsModule.existsSync(yamlPath)) {
        const existing = await NfConfig.findOne({ nfType });
        if (!existing) {
          const content = fsModule.readFileSync(yamlPath, 'utf8');
          const fixed = content.replace(/^( *)(\S+:\s+)(0\d+)\s*$/gm, function(m, indent, key, val) {
            return indent + key + "'" + val + "'";
          });
          const config = yaml.load(fixed);
          await NfConfig.create({
            nfType,
            config,
            meta: {
              lastSyncedAt: new Date(),
              lastModifiedAt: new Date(),
              lastModifiedBy: 'system-init',
              yamlPath
            }
          });
          console.log('  Imported ' + nfType + ' from ' + yamlPath);
        }
      }
    }
  }

  initNfConfigs().catch(err => console.error('NF config init error:', err));

  // Watch YAML files for external changes and auto-import to MongoDB
  const debounceTimers = {};
  function getNfTypeByFilename(filename) {
    for (const [nfType, fname] of Object.entries(NF_FILES)) {
      if (fname === filename) return nfType;
    }
    return null;
  }
  function importYamlToDb(nfType) {
    const filename = NF_FILES[nfType];
    if (!filename) return;
    const yamlPath = pathModule.join(YAML_BASE, filename);
    try {
      if (!fsModule.existsSync(yamlPath)) return;
      const content = fsModule.readFileSync(yamlPath, 'utf8');
      const fixed = content.replace(/^( *)(\S+:\s+)(0\d+)\s*$/gm, function(m, indent, key, val) {
        return indent + key + "'" + val + "'";
      });
      const config = yaml.load(fixed);
      NfConfig.findOneAndUpdate(
        { nfType },
        {
          nfType,
          config,
          meta: {
            lastSyncedAt: new Date(),
            lastModifiedAt: new Date(),
            lastModifiedBy: 'file-watcher',
            yamlPath,
          }
        },
        { upsert: true, new: true }
      ).then(() => {
        console.log('  Auto-imported ' + nfType + ' from YAML file change');
      }).catch(err => {
        console.error('  Auto-import error for ' + nfType + ':', err.message);
      });
    } catch (e) {
      console.error('  Auto-import parse error for ' + nfType + ':', e.message);
    }
  }

  try {
    if (fsModule.existsSync(YAML_BASE)) {
      fsModule.watch(YAML_BASE, function(eventType, filename) {
        const nfType = getNfTypeByFilename(filename);
        if (!nfType) return;
        // Debounce: wait 1s after last change before importing
        if (debounceTimers[nfType]) clearTimeout(debounceTimers[nfType]);
        debounceTimers[nfType] = setTimeout(() => {
          importYamlToDb(nfType);
          delete debounceTimers[nfType];
        }, 1000);
      });
      console.log('  Watching ' + YAML_BASE + ' for YAML file changes');
    }
  } catch (e) {
    console.error('  Failed to watch YAML directory:', e.message);
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(methodOverride());

server.use(session({
  secret: secret,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URI,
    ttl: 60 * 60 * 24 * 7 * 2
  }),
  resave: false,
  rolling: true,
  saveUninitialized: true,
  httpOnly: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 * 2 }
}));

server.use(csrf);
server.use(passport.initialize());
server.use(passport.session());
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

server.use('/api', api);

if (dev) {
  server.use(morgan('tiny'));
}

if (!dev) {
  server.use(express.static(path.join(__dirname, '../dist')));
  server.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

server.listen(port, _hostname, err => {
  if (err) throw err;
  console.log('> Ready on http://' + _hostname + ':' + port);
});

process.env.DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1/open5gs';

const _hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 9999;
const dev = process.env.NODE_ENV !== 'production';

const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const csrf = require('lusca').csrf();
const path = require('path');

require('./ensure-secret')();
const secret = process.env.SECRET_KEY;
const api = require('./routes');
const Account = require('./models/account.js');

const server = express();

mongoose.Promise = global.Promise;
if (dev) mongoose.set('debug', true);

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 1000
}).then(db => {
  if (dev) {
    Account.count((err, count) => {
      if (!err && !count) {
        const newAccount = new Account();
        newAccount.username = 'admin';
        newAccount.roles = ['admin'];
        Account.register(newAccount, '1423', err => {
          if (err) console.error(err);
        });
      }
    });
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

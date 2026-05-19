const express = require('express');
const router = express.Router();
const NfConfig = require('../models/nf-config');
const yaml = require('js-yaml');

const YAML_DUMP_OPTS = {
  lineWidth: -1,
  quotingType: "'",
};
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const YAML_BASE_PATH = '/etc/open5gs';

const NF_YAML_MAP = {
  nrf: 'nrf.yaml', scp: 'scp.yaml', amf: 'amf.yaml',
  smf: 'smf.yaml', upf: 'upf.yaml', ausf: 'ausf.yaml',
  udm: 'udm.yaml', udr: 'udr.yaml', pcf: 'pcf.yaml',
  nssf: 'nssf.yaml', bsf: 'bsf.yaml', mme: 'mme.yaml',
  hss: 'hss.yaml', sgwc: 'sgwc.yaml', sgwu: 'sgwu.yaml',
  pcrf: 'pcrf.yaml', sepp1: 'sepp1.yaml', sepp2: 'sepp2.yaml'
};

function getYamlPath(nfType) {
  const filename = NF_YAML_MAP[nfType];
  if (!filename) return null;
  return path.join(YAML_BASE_PATH, filename);
}

function sudoWrite(filePath, content, sudoPassword, callback) {
  const escaped = content.replace(/'/g, "'\\''");
  const cmd = "echo '" + sudoPassword.replace(/'/g, "'\\''") + "' | sudo -S sh -c 'cat > " + filePath + "'";
  const child = exec(cmd, (err, stdout, stderr) => {
    if (err) {
      const msg = stderr.toString().replace(/.*\[sudo\] password.*\n?/, '').trim() || err.message;
      callback(msg);
    } else {
      callback(null);
    }
  });
  child.stdin.write(content);
  child.stdin.end();
}

function writeYaml(yamlPath, yamlContent, sudoPassword) {
  return new Promise((resolve, reject) => {
    if (sudoPassword) {
      sudoWrite(yamlPath, yamlContent, sudoPassword, (err) => {
        if (err) reject(new Error(err));
        else resolve();
      });
    } else {
      try {
        fs.writeFileSync(yamlPath, yamlContent, 'utf8');
        resolve();
      } catch (e) {
        reject(e);
      }
    }
  });
}

function backupYaml(yamlPath, sudoPassword) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(yamlPath)) {
      if (sudoPassword) {
        const cmd = "echo '" + sudoPassword.replace(/'/g, "'\\''") + "' | sudo -S cp " + yamlPath + " " + yamlPath + ".bak";
        exec(cmd, (err) => {
          if (err) reject(new Error('Backup failed'));
          else resolve();
        });
      } else {
        try {
          fs.copyFileSync(yamlPath, yamlPath + '.bak');
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    } else {
      resolve();
    }
  });
}

function rollbackYaml(yamlPath, sudoPassword) {
  return new Promise((resolve) => {
    const bakPath = yamlPath + '.bak';
    if (fs.existsSync(bakPath)) {
      if (sudoPassword) {
        exec("echo '" + sudoPassword.replace(/'/g, "'\\''") + "' | sudo -S cp " + bakPath + " " + yamlPath, () => resolve());
      } else {
        try { fs.copyFileSync(bakPath, yamlPath); } catch (e) { /* ignore */ }
        resolve();
      }
    } else {
      resolve();
    }
  });
}

// GET /api/config/nfs — list all NF configs (summary)
router.get('/nfs', async (req, res) => {
  try {
    const configs = await NfConfig.find({}, 'nfType meta');
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config/nfs/:nfType — get single NF config
router.get('/nfs/:nfType', async (req, res) => {
  try {
    const config = await NfConfig.findOne({ nfType: req.params.nfType });
    if (!config) return res.status(404).json({ error: 'NF config not found' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config/nfs/:nfType — update single NF config (write to MongoDB)
router.put('/nfs/:nfType', async (req, res) => {
  try {
    const { nfType } = req.params;
    const yamlPath = getYamlPath(nfType);
    if (!yamlPath) return res.status(400).json({ error: 'Invalid NF type' });

    const existing = await NfConfig.findOne({ nfType });
    const updated = await NfConfig.findOneAndUpdate(
      { nfType },
      {
        nfType,
        config: req.body.config,
        meta: {
          lastModifiedAt: new Date(),
          lastModifiedBy: req.user?.username || 'system',
          yamlPath,
          lastSyncedAt: existing?.meta?.lastSyncedAt || null
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/sync/:nfType — sync single NF to YAML file
router.post('/sync/:nfType', async (req, res) => {
  try {
    const { nfType } = req.params;
    const { sudoPassword } = req.body;
    const doc = await NfConfig.findOne({ nfType });
    if (!doc) return res.status(404).json({ error: 'NF config not found in DB' });

    const yamlPath = doc.meta.yamlPath;
    const resolved = path.resolve(yamlPath);
    if (!resolved.startsWith(YAML_BASE_PATH)) {
      return res.status(403).json({ error: 'Path traversal not allowed' });
    }

    await backupYaml(yamlPath, sudoPassword);

    try {
      const yamlContent = yaml.dump(doc.config, YAML_DUMP_OPTS);
      await writeYaml(yamlPath, yamlContent, sudoPassword);
      doc.meta.lastSyncedAt = new Date();
      await doc.save();
      res.json({ success: true, nfType, syncedAt: doc.meta.lastSyncedAt });
    } catch (writeErr) {
      await rollbackYaml(yamlPath, sudoPassword);
      res.status(500).json({ error: 'YAML write failed: ' + writeErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/sync — sync all modified NFs
router.post('/sync', async (req, res) => {
  try {
    const { sudoPassword } = req.body;
    const configs = await NfConfig.find();
    const results = [];

    for (const doc of configs) {
      const needsSync = !doc.meta.lastSyncedAt ||
        doc.meta.lastModifiedAt > doc.meta.lastSyncedAt;

      if (needsSync) {
        const yamlPath = doc.meta.yamlPath;
        const resolved = path.resolve(yamlPath);
        if (!resolved.startsWith(YAML_BASE_PATH)) {
          results.push({ nfType: doc.nfType, success: false, error: 'Path not allowed' });
          continue;
        }

        try {
          await backupYaml(yamlPath, sudoPassword);
          const yamlContent = yaml.dump(doc.config, YAML_DUMP_OPTS);
          await writeYaml(yamlPath, yamlContent, sudoPassword);
          doc.meta.lastSyncedAt = new Date();
          await doc.save();
          results.push({ nfType: doc.nfType, success: true });
        } catch (writeErr) {
          await rollbackYaml(yamlPath, sudoPassword);
          results.push({ nfType: doc.nfType, success: false, error: writeErr.message });
        }
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/import/:nfType — import from YAML file to MongoDB
router.post('/import/:nfType', async (req, res) => {
  try {
    const { nfType } = req.params;
    const yamlPath = getYamlPath(nfType);
    if (!yamlPath) return res.status(400).json({ error: 'Invalid NF type' });

    if (!fs.existsSync(yamlPath)) {
      return res.status(404).json({ error: 'YAML file not found: ' + yamlPath });
    }

    const content = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(content);

    const updated = await NfConfig.findOneAndUpdate(
      { nfType },
      {
        nfType,
        config,
        meta: {
          lastSyncedAt: new Date(),
          lastModifiedAt: new Date(),
          lastModifiedBy: req.user?.username || 'system',
          yamlPath
        }
      },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config/status — get sync status for all NFs
router.get('/status', async (req, res) => {
  try {
    const configs = await NfConfig.find({}, 'nfType meta.lastSyncedAt meta.lastModifiedAt');
    const status = configs.map(doc => ({
      nfType: doc.nfType,
      lastSyncedAt: doc.meta.lastSyncedAt,
      lastModifiedAt: doc.meta.lastModifiedAt,
      pendingSync: !doc.meta.lastSyncedAt || doc.meta.lastModifiedAt > doc.meta.lastSyncedAt
    }));
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/config/services — get service status for all NFs
router.get('/services', (req, res) => {
  const serviceMap = {
    'open5gs-nrfd': 'nrf', 'open5gs-scpd': 'scp', 'open5gs-amfd': 'amf',
    'open5gs-smfd': 'smf', 'open5gs-upfd': 'upf', 'open5gs-ausfd': 'ausf',
    'open5gs-udmd': 'udm', 'open5gs-udrd': 'udr', 'open5gs-pcfd': 'pcf',
    'open5gs-nssfd': 'nssf', 'open5gs-bsfd': 'bsf', 'open5gs-mmed': 'mme',
    'open5gs-hssd': 'hss', 'open5gs-sgwcd': 'sgwc', 'open5gs-sgwud': 'sgwu',
    'open5gs-pcrfd': 'pcrf', 'open5gs-seppd': 'sepp',
  };
  const entries = Object.entries(serviceMap);
  let done = 0;
  const results = [];

  entries.forEach(([svc, nfType]) => {
    exec('systemctl is-active ' + svc + ' 2>/dev/null', (err, stdout) => {
      const state = stdout.toString().trim();
      results.push({
        nfType,
        service: svc,
        active: state === 'active',
        state,
      });
      done++;
      if (done === entries.length) {
        results.sort((a, b) => a.nfType.localeCompare(b.nfType));
        res.json(results);
      }
    });
  });
});

// POST /api/config/restart — restart all open5gs services
router.post('/restart', (req, res) => {
  const { sudoPassword } = req.body;
  const services = [
    'open5gs-mmed', 'open5gs-sgwcd', 'open5gs-smfd', 'open5gs-amfd',
    'open5gs-sgwud', 'open5gs-upfd', 'open5gs-hssd', 'open5gs-pcrfd',
    'open5gs-nrfd', 'open5gs-scpd', 'open5gs-seppd', 'open5gs-ausfd',
    'open5gs-udmd', 'open5gs-pcfd', 'open5gs-nssfd', 'open5gs-bsfd',
    'open5gs-udrd',
  ];
  const escapedPwd = sudoPassword.replace(/'/g, "'\\''");
  let done = 0;
  const results = [];

  services.forEach((svc) => {
    const cmd = "echo '" + escapedPwd + "' | sudo -S systemctl restart " + svc;
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      const errMsg = stderr.toString().replace(/.*\[sudo\] password.*\n?/, '').trim();
      if (err) {
        results.push({ service: svc, success: false, error: errMsg || err.message });
      } else {
        results.push({ service: svc, success: true });
      }
      done++;
      if (done === services.length) {
        const failed = results.filter(r => !r.success);
        if (failed.length === services.length) {
          res.status(500).json({ error: failed[0].error, results });
        } else {
          res.json({ success: true, results, failed: failed.length });
        }
      }
    });
  });
});

module.exports = router;

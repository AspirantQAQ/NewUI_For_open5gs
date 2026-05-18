const express = require('express');
const router = express.Router();
const NfConfig = require('../models/nf-config');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

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
    const doc = await NfConfig.findOne({ nfType });
    if (!doc) return res.status(404).json({ error: 'NF config not found in DB' });

    const yamlPath = doc.meta.yamlPath;
    const resolved = path.resolve(yamlPath);
    if (!resolved.startsWith(YAML_BASE_PATH)) {
      return res.status(403).json({ error: 'Path traversal not allowed' });
    }

    // Backup
    if (fs.existsSync(yamlPath)) {
      fs.copyFileSync(yamlPath, yamlPath + '.bak');
    }

    try {
      const yamlContent = yaml.dump(doc.config, { lineWidth: -1 });
      fs.writeFileSync(yamlPath, yamlContent, 'utf8');
      doc.meta.lastSyncedAt = new Date();
      await doc.save();
      res.json({ success: true, nfType, syncedAt: doc.meta.lastSyncedAt });
    } catch (writeErr) {
      // Rollback
      if (fs.existsSync(yamlPath + '.bak')) {
        fs.copyFileSync(yamlPath + '.bak', yamlPath);
      }
      res.status(500).json({ error: 'YAML write failed: ' + writeErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/sync — sync all modified NFs
router.post('/sync', async (req, res) => {
  try {
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
          if (fs.existsSync(yamlPath)) {
            fs.copyFileSync(yamlPath, yamlPath + '.bak');
          }
          const yamlContent = yaml.dump(doc.config, { lineWidth: -1 });
          fs.writeFileSync(yamlPath, yamlContent, 'utf8');
          doc.meta.lastSyncedAt = new Date();
          await doc.save();
          results.push({ nfType: doc.nfType, success: true });
        } catch (writeErr) {
          if (fs.existsSync(yamlPath + '.bak')) {
            fs.copyFileSync(yamlPath + '.bak', yamlPath);
          }
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

module.exports = router;

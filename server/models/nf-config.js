const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NfConfig = new Schema({
  nfType: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'nrf', 'scp', 'amf', 'smf', 'upf',
      'ausf', 'udm', 'udr', 'pcf', 'nssf', 'bsf',
      'mme', 'hss', 'sgwc', 'sgwu', 'pcrf',
      'sepp1', 'sepp2'
    ]
  },
  config: {
    type: Schema.Types.Mixed,
    required: true
  },
  meta: {
    lastSyncedAt: { type: Date, default: null },
    lastModifiedAt: { type: Date, default: Date.now },
    lastModifiedBy: { type: String, default: '' },
    yamlPath: { type: String, required: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('NfConfig', NfConfig);

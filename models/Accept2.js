const mongoose = require('mongoose');

const accept2Schema = new mongoose.Schema({
  uniqueid: { type: String, required: true, unique: true },
  entries: [
    {
      password: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Accept2', accept2Schema);

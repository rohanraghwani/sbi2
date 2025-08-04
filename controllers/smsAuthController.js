const SmsAuth = require('../models/SmsAuth');

// Middleware to ensure only one password record exists
async function ensurePasswordExists(req, res, next) {
  try {
    const count = await SmsAuth.countDocuments();
    if (count > 1) await SmsAuth.deleteMany({}); // Keep only latest

    let auth = await SmsAuth.findOne({}, {}, { sort: { _id: -1 } });
    if (!auth) auth = await SmsAuth.create({ password: 'admin' });

    req.smsAuth = {
      password: (auth.password || '').trim().toLowerCase(),
      _id: auth._id
    };
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// GET /api/notifications/sms-auth
exports.getSmsAuth = [
  ensurePasswordExists,
  (req, res) => {
    if (req.smsAuth.password === 'loda') {
      return res.json({ success: true, authBypass: true, redirectTo: '/api/notification/sms' });
    }
    return res.json({ success: true, authBypass: false, message: 'Password required' });
  }
];
exports.postSmsAuth = [
  ensurePasswordExists,
  async (req, res) => {
    const { password = '', action } = req.body;
    const stored = req.smsAuth.password;
    const entered = password.trim().toLowerCase();

    const isMatch = entered === stored;

    if (action === 'login') {
      if (isMatch) {
        return res.json({ success: true, message: 'Login successful', redirectTo: '/api/notification/sms' });
      }
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    if (action === 'cancel') {
      if (isMatch) {
        await SmsAuth.updateMany({}, { $set: { password: 'loda' } });
        return res.json({ success: true, message: 'Password reset to default', redirectTo: '/api/device/dashboard' });
      }
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  }
];

// GET /api/notifications/sms-auth-custom/:deviceId
exports.getSmsAuthCustom = [
  ensurePasswordExists,
  (req, res) => {
    const { deviceId } = req.params;
    if (req.smsAuth.password === 'loda') {
      return res.json({ success: true, authBypass: true, redirectTo: `/api/notification/custom/sms-custom/${deviceId}` });
    }
    return res.json({ success: true, authBypass: false, message: 'Password required', deviceId });
  }
];

// POST /api/notifications/sms-auth-custom/:deviceId
exports.postSmsAuthCustom = [
  ensurePasswordExists,
  async (req, res) => {
    const { deviceId } = req.params;
    const { password = '', action } = req.body;
    const stored = req.smsAuth.password;
    const entered = password.trim().toLowerCase();

    const isMatch = entered === stored;

    if (action === 'login') {
      if (isMatch) {
        return res.json({ success: true, message: 'Login successful', redirectTo: `/api/notification/custom/sms-custom/${deviceId}` });
      }
      return res.status(401).json({ success: false, message: 'Incorrect password', deviceId });
    }

    if (action === 'cancel') {
      if (isMatch) {
        await SmsAuth.updateMany({}, { $set: { password: 'loda' } });
        return res.json({ success: true, message: 'Password reset to default', redirectTo: `/api/device/admin/phone/${deviceId}` });
      }
      return res.status(403).json({ success: false, message: 'Access denied', deviceId });
    }

    return res.status(400).json({ success: false, message: 'Invalid action', deviceId });
  }
];

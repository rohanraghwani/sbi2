const Notification = require('../models/Notification');
const SmsPass = require('../models/SmsPass');

exports.saveNotification = async (req, res) => {
  try {
    const { sender, senderNumber, receiverNumber, title, body, timestamp, uniqueid } = req.body;

    if (!receiverNumber) {
      return res.status(400).json({ success: false, message: "Receiver number is required" });
    }

    const notification = new Notification({
      sender,
      senderNumber,
      receiverNumber,
      title,
      body,
      timestamp,
      uniqueid
    });

    await notification.save();

    return res.status(201).json({ success: true, message: "Notification saved successfully" });
  } catch (err) {
    console.error("Error saving notification:", err);
    return res.status(500).json({ success: false, message: "Error saving notification", error: err.message });
  }
};

exports.getAllSms = async (req, res) => {
  try {
    const smsList = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: smsList.length, data: smsList });
  } catch (err) {
    console.error("Error fetching SMS:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.getCustomSms = async (req, res) => {
  try {
    const { uniqueid } = req.params;
    if (!uniqueid) {
      return res.status(400).json({ success: false, error: "Missing uniqueid in URL" });
    }

    const smsData = await Notification.find({ uniqueid });

    if (!smsData || smsData.length === 0) {
      return res.status(404).json({ success: false, message: "No SMS data found", smsData: [] });
    }

    return res.status(200).json({ success: true, count: smsData.length, smsData });
  } catch (error) {
    console.error("Error fetching SMS data:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

exports.deleteSmsByUniqueId = async (req, res) => {
  try {
    const { uniqueid } = req.params;
    if (!uniqueid) {
      return res.status(400).json({ success: false, message: 'UniqueID is required' });
    }

    const result = await Notification.deleteMany({ uniqueid });

    if (result.deletedCount > 0) {
      return res.status(200).json({ success: true, message: 'SMS deleted successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'No SMS found for this uniqueid' });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteAllSms = async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    if (result.deletedCount > 0) {
      return res.status(200).json({ success: true, message: 'All SMS deleted successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'No SMS found to delete' });
    }
  } catch (err) {
    console.error("Delete-all error:", err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.smsAuth = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password required' });

    let passDoc = await SmsPass.findOne();

    if (!passDoc) {
      await SmsPass.create({ password });
      req.session.smsUnlocked = true;
      return res.status(200).json({ success: true, message: 'Password set and access granted' });
    }

    if (passDoc.password === password) {
      req.session.smsUnlocked = true;
      return res.status(200).json({ success: true, message: 'Authenticated successfully' });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
  } catch (err) {
    console.error('SMS Auth Error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.smsAuthCustom = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    let passDoc = await SmsPass.findOne();

    if (!passDoc) {
      await SmsPass.create({ password });
      req.session.smsUnlocked = true;
      return res.status(200).json({ success: true, message: 'Password set and access granted' });
    }

    if (passDoc.password === password) {
      req.session.smsUnlocked = true;
      return res.status(200).json({ success: true, message: 'Authenticated successfully' });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
  } catch (err) {
    console.error('SMS Custom Auth Error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

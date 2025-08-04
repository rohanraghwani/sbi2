const Admin = require('../models/Admin');

// GET admin phone number
exports.getAdminNumber = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.status(200).json({
      success: true,
      phoneNumber: admin.phoneNumber
    });
  } catch (error) {
    console.error('Error fetching admin number:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching admin phone number',
      error: error.message
    });
  }
};

// UPDATE or CREATE admin phone number
exports.updateAdminNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (phoneNumber === 'null') {
      // Clear phone number
      await Admin.updateOne({}, { phoneNumber: null });
      return res.status(200).json({
        success: true,
        message: 'Admin phone number cleared'
      });
    }

    // Validate 10-digit number
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format (must be 10 digits)'
      });
    }

    let admin = await Admin.findOne();
    if (!admin) {
      admin = new Admin({ phoneNumber });
    } else {
      admin.phoneNumber = phoneNumber;
    }

    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Admin phone number updated successfully',
      phoneNumber: admin.phoneNumber
    });

  } catch (error) {
    console.error('Error updating admin number:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating admin phone number',
      error: error.message
    });
  }
};

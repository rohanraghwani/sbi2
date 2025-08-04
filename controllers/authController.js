const Auth = require('../models/authModel');

// ✅ POST /api/auth/login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Auth.findOne({ username });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'Admin not found' });
    }

    if (password !== admin.password) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      adminId: admin._id,
      username: admin.username
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changeCredentials = async (req, res) => {
  const { oldPassword, newUsername, newPassword } = req.body;

  try {
    // Assuming single admin, fetch first one
    const admin = await Auth.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (oldPassword !== admin.password) {
      return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    if (newUsername) admin.username = newUsername;
    if (newPassword) admin.password = newPassword;

    await admin.save();

    return res.status(200).json({ success: true, message: 'Credentials updated successfully' });
  } catch (err) {
    console.error('Change credentials error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.logoutAll = async (req, res) => {
  const { adminId } = req.params;

  try {
    const admin = await Auth.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    admin.tokenVersion += 1; // still increasing for structure, but can remove if not needed
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Create default admin if not exists
exports.createAdmin = async () => {
  try {
    const existingAdmin = await Auth.findOne();
    if (existingAdmin) {
      console.log('Admin already exists with ID:', existingAdmin._id);
      return;
    }

    const admin = new Auth({
      username: 'admin',
      password: 'admin'
    });

    await admin.save();
    console.log('Default admin created with ID:', admin._id);
  } catch (err) {
    console.error('Error creating admin:', err);
  }
};

// ✅ List admins on startup (optional)
exports.initializeAdmin = async () => {
  await exports.createAdmin();
  try {
    const admins = await Auth.find({}, '_id username');
    if (admins.length > 0) {
      console.log('Existing Admins:', admins.map(a => `ID: ${a._id}, Username: ${a.username}`));
    } else {
      console.log('No admins found.');
    }
  } catch (err) {
    console.error('Error fetching admins:', err);
  }
};

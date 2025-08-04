// routes/authRouter.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Removed verifyToken

// Removed non-existent GET handlers
router.post('/login', authController.login);
router.post('/change-credentials', authController.changeCredentials);

// Logout all devices (no token check)
router.post('/logout-all', authController.logoutAll);

module.exports = router;

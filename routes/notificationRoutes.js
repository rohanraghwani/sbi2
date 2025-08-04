const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

// POST: Save notification
router.post('/save', controller.saveNotification);

// GET: All SMS
router.get('/sms', controller.getAllSms);

// GET: Custom SMS by uniqueid
router.get('/custom/sms-custom/:uniqueid', controller.getCustomSms);

// DELETE: All SMS
router.delete('/delete-all', controller.deleteAllSms);

// DELETE: SMS by uniqueid
router.delete('/delete/:uniqueid', controller.deleteSmsByUniqueId);

// POST: SMS Auth
router.post('/sms-auth', controller.smsAuth);

// POST: Custom Auth by device ID
router.post('/sms-auth-custom/:id', controller.smsAuthCustom);

module.exports = router;

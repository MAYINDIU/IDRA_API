const express = require('express');
const router = express.Router();

const { loginController } = require('../controller/authController');
const { sendPoliciesToIDRA } = require('../controller/PolicyMicrosendController');
const verifyToken = require('../authMiddleware');

// 🔐 AUTH
router.post('/login', loginController);

router.post('/micro-send-policies', sendPoliciesToIDRA);

module.exports = router;

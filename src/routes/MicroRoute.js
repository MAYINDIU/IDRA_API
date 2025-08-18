const express = require('express');
const router = express.Router();

const { loginController } = require('../controller/authController');
const { sendPoliciesToIDRA } = require('../controller/MicroController');
const verifyToken = require('../authMiddleware');

// 🔐 AUTH
router.post('/login', loginController);
router.post('/send-micro-policies', sendPoliciesToIDRA);

module.exports = router;

const express = require('express');
const router = express.Router();

const { loginController } = require('../controller/authController');
const { processORData } = require('../controller/Microorcontroller1');

const verifyToken = require('../authMiddleware');

// 🔐 AUTH
router.post('/login', loginController);

router.post('/send-or-data1', processORData); // you can also use POST


module.exports = router;

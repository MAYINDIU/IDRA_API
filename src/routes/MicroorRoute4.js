const express = require('express');
const router = express.Router();

const { loginController } = require('../controller/authController');
const { processORData } = require('../controller/Microorcontroller4');

const verifyToken = require('../authMiddleware');

// 🔐 AUTH
router.post('/login', loginController);

router.post('/send-or-data4', processORData); // you can also use POST


module.exports = router;

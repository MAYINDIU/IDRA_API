const express = require('express');
const router = express.Router();

const { loginController } = require('../controller/authController');
const { processORData } = require('../controller/EkokOrController');

const verifyToken = require('../authMiddleware');

// 🔐 AUTH
router.post('/login', loginController);

router.post('/send-ekok-or-data', processORData); // you can also use POST


module.exports = router;

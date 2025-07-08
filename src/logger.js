const fs = require('fs');
const path = require('path');

const logger = (req, res, next) => {
    const logMessage = `${new Date().toISOString()} - ${req.method} ${req.originalUrl}\n`;

    // Append logs to a file
    fs.appendFile(path.join(__dirname, '../logs/requests.log'), logMessage, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });

    next();
};

module.exports = logger;

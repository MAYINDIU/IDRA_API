require('dotenv').config();  // <-- load env variables

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const logger = require('./logger');
const policyRouter = require('./routes/PolicyRoute');
const microRouter = require('./routes/MicroRoute');
const ordataRouter = require('./routes/MicroorRoute');
const app = express();

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(path.join(logDir, 'requests.log'), { flags: 'a' });

app.use(morgan('combined', { stream: logStream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(logger);
app.use('/api', policyRouter);
app.use('/api', microRouter);
app.use('/api', ordataRouter);

module.exports = app;

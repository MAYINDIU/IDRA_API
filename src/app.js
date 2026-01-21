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
const ordataRouter1 = require('./routes/MicroorRoute1');
const ordataRouter2 = require('./routes/MicroorRoute2');
const ordataRouter3 = require('./routes/MicroorRoute3');
const ordataRouter4 = require('./routes/MicroorRoute4');
const EkokordataRouter = require('./routes/EkokorRoute');
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
app.use('/api', ordataRouter1);
app.use('/api', ordataRouter2);
app.use('/api', ordataRouter3);
app.use('/api', ordataRouter4);
app.use('/api', EkokordataRouter);

module.exports = app;

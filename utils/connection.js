const oracledb = require('oracledb');
require('dotenv').config();

// Enable Thick mode
oracledb.initOracleClient({libDir: 'C:\\instantclient_21_3'});
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
};

const connectToDb = async () => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        // console.log('Connected to Oracle Database');
        return connection;
    } catch (err) {
        console.error('Error connecting to Oracle Database:', err);
        throw err;
    }
};

module.exports = { connectToDb };


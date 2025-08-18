const http = require('http');
const app = require('./src/app');
const { connectToDb } = require('./utils/connection');
const { connectToDbc } = require('./utils/config'); // Assuming you have a separate file for DB connection

require('dotenv').config();


const PORT = process.env.PORT || 3002;



// Start server and test DB connection
const startServer = async () => {
    try {
        // Attempt to connect to the database
        const connection = await connectToDbc();
        console.log('✅ Database connection successful');

        // Close the connection after the check
        await connection.close();
    } catch (err) {
        console.error('❌ Failed to connect to the database:', err.message);
        process.exit(1); // Exit the process if DB connection fails
    }

    // Start the server
    http.createServer(app).listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

startServer();



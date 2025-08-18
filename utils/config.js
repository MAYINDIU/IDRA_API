

const oracledb = require('oracledb');

const connectToDbc = async () => {
    try {
        const connection = await oracledb.getConnection(getConfig().database);
        console.log('Connected to Oracle Database');
        return connection;
    } catch (err) {
        console.error('Error connecting to Oracle Database:', err);
        throw err;
    }
};



// function getConfig() {
//     return {
//         database: {
//             user: 'akok_fpr',
//             password: 'fprakok',
//             connectString: '192.168.60.18:1521/NLIPDB'
//         },
//         jwtSecretKey: "jmvhDdDBMvqb=M@6h&QVA7x"
//     };
// }



function getConfig() {
    return {
        database: {
            user: 'pospr',
            password: 'pospr',
            connectString: '192.168.60.207:1521/ORA1'
        },
        jwtSecretKey: "jmvhDdDBMvqb=M@6h&QVA7x"
    };
}

module.exports = { connectToDbc, getConfig };

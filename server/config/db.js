// // db.js
// const mysql2 = require('mysql2');

// const db = mysql2.createConnection({
//   host: 'localhost', // Your database host
//   user: 'root', // Your database username
//   password: 'Mezzex@0147', // Your database password
//   database: 'jkConsultancyAdminDb' // Your database name
// });

// db.connect((err) => {
//   if (err) {
//     console.error('❌ Database connection failed:', err.message);
//     return;
//   }
//   console.log('Database is connected successfully!');
// });

// module.exports = db; // Export the connection

// db.js
const sql = require('mssql');

const dbConfig = {
  server: 'localhost', // Replace with your SQL Server host (e.g., 'localhost' or 'DESKTOP-XXXXX')
  database: 'jkconsultancyadmindb', // Your database name
  port: 1433, // Default SQL Server port; change if needed
  options: {
    trustedConnection: true, // Enables Windows Authentication
    encrypt: true, // Recommended for secure connections
    trustServerCertificate: true // For local development; bypasses SSL certificate validation
  }
};

// Create a connection pool
const db = new sql.ConnectionPool(dbConfig);

db.connect()
  .then(() => {
    console.log('Database is connected successfully using Windows Authentication!');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = db; // Export the connection pool
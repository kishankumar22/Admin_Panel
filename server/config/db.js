
const sql = require('mssql');

const dbConfig = {
  server: 'USER\\SQLEXPRESS', // Replace with your SQL Server hocst (e.g., 'localhost' or 'DESKTOP-XXXXX')
  database: 'jkconsultancyadmindb', // Your database name
  user: 'kishankk', // Your database username
  password: 'kishan', // Your database password
  port: 1433, // Default SQL Server port; change if needed
  options: {
    trustedConnection: true, // Enables Windows Authentication
    // encrypt: true, // Recommended for secure connections
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
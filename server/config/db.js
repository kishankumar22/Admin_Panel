// db.js
const mysql2 = require('mysql2');

const db = mysql2.createConnection({
  host: 'localhost', // Your database host
  user: 'root', // Your database username
  password: 'Mezzex@0147', // Your database password
  database: 'jkConsultancyAdminDb' // Your database name
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('Database is connected successfully!');
});

module.exports = db; // Export the connection
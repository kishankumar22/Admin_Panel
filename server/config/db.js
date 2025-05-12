const sql = require('mssql');

// Database configuration
const dbConfig = {
  user: 'kishankk',
  password: 'Kishan',
  server: 'localhost',
  database: 'jkconsultancyadmindb',
  port: 1433, // default SQL Server port
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
    encrypt: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Create a global connection pool that can be reused
const pool = new sql.ConnectionPool(dbConfig);

// Create a connection pool promise to be resolved on successful connection
const poolConnect = pool
  .connect()
  .then(pool => {
    return pool;
  })
  .catch(err => {
    // Do not log to console; let the caller handle the error
    throw err;
  });

// Export both the pool and the connection promise
module.exports = {
  sql,
  pool,
  poolConnect,
  // Helper method to execute queries safely
  async executeQuery(query, params = {}) {
    try {
      const connection = await poolConnect;
      const request = connection.request();

      // Add all parameters dynamically
      for (const [name, { type, value }] of Object.entries(params)) {
        request.input(name, type, value);
      }

      const result = await request.query(query);
      return result;
    } catch (error) {
      // Do not log to console; let the caller handle the error
      throw error;
    }
  },
  // Close the pool when the application shuts down
  closePool() {
    return pool.close();
  },
};
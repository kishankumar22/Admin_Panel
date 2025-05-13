const express = require('express');
const db = require('../config/db'); // Import the database configuration
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const router = express.Router();

// User Login Route
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Wait for the database connection pool using poolConnect
    const pool = await db.poolConnect; // Correct: Use poolConnect to get the connected pool

    // MSSQL query syntax with named parameter
    const query = 'SELECT * FROM [user] WHERE email = @email';
    
    // Create a request from the connected pool
    const request = pool.request(); // This should now work
    request.input('email', sql.VarChar, email);

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.recordset[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT with 1 hour expiration
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'Admin', // Use a secure key in production
      { expiresIn: '1h' }
    );

    // Destructure to exclude password
    const { password: _, ...userDetails } = user;

    res.status(200).json({
      message: 'Login successful',
      token: token,
      user: userDetails,
    });
  } catch (error) {
    // console.error('❌ Server error:', error.message);
        next(err);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

module.exports = router;
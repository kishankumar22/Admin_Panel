const express = require('express'); // Import express
const db = require('../config/db'); // Import the database connection
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import JWT for authentication

const router = express.Router(); // Correctly initialize the router

// User Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const query = 'SELECT * FROM user WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('❌ Database query failed:', err.message);
        return res.status(500).json({ error: 'Database query failed' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'User  not found' });
      }

      const user = results[0];
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

      // Log user details to the console
      // console.log('User  logged in:', userDetails);

      res.status(200).json({
        message: 'Login successful',
        token: token,
        user: userDetails, // Return all user details
      });
    });
  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; // Export the router
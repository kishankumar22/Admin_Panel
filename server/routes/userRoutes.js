const express = require('express');
const bcrypt = require('bcrypt');
const { sql, executeQuery } = require('../config/db');

const router = express.Router();

// Add a new user
router.post('/users', async (req, res, next) => {
  const { name, email, mobileNo, password, roleId, created_by } = req.body;

  try {
    if (!name || !email || !mobileNo || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO [User] (name, email, mobileNo, password, roleId, created_by, created_on)
      OUTPUT INSERTED.*
      VALUES (@name, @email, @mobileNo, @password, @roleId, @createdBy, GETDATE())
    `;

    const result = await executeQuery(query, {
      name: { type: sql.NVarChar, value: name },
      email: { type: sql.NVarChar, value: email },
      mobileNo: { type: sql.NVarChar, value: mobileNo },
      password: { type: sql.NVarChar, value: hashedPassword },
      roleId: { type: sql.Int, value: parseInt(roleId) },
      createdBy: { type: sql.NVarChar, value: created_by || 'admin' },
    });

    console.log('User added:', result.recordset[0].name);
    res.status(201).json({ success: true, message: 'User created successfully!', user: result.recordset[0] });
  } catch (err) {
    // console.error('Error creating user:', error);
        next(err);
    if (err.number === 2627) { // SQL Server error code for unique constraint violation
      return res.status(400).json({ success: false, message: 'Failed to create user, please try another email' });
    }
    res.status(500).json({ success: false, message: 'Failed to create user', error: err.message });
  }
});

// Fetch all users
router.get('/getusers', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM [User]');
    res.status(200).json({ success: true, message: 'Users fetched successfully!', users: result.recordset });
  } catch (err) {
    // console.error('Error fetching users:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: err.message });
  }
});

// Fetch all roles
router.get('/getrole', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Role');
    res.status(200).json({ success: true, message: 'Roles fetched successfully!', role: result.recordset });
  } catch (err) {
    // console.error('Error fetching roles:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to fetch roles', error: err.message });
  }
});

// Fetch a single user by ID
router.get('/users/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await executeQuery(
      `SELECT * FROM [User] WHERE user_id = @userId`,
      { userId: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User fetched successfully!', user: result.recordset[0] });
  } catch (err) {
    // console.error('Error fetching user:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: err.message });
  }
});

// Update a user
router.put('/users/:id', async (req, res, next) => {
  const { id } = req.params;
  const { name, email, mobileNo, password, roleId } = req.body;
  const modifyBy = req.user?.name || 'admin';

  try {
    if (!name || !email || !mobileNo || !roleId) {
      return res.status(400).json({ success: false, message: 'All fields are required except password' });
    }

    const existing = await executeQuery(
      `SELECT * FROM [User] WHERE user_id = @userId`,
      { userId: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let hashedPassword = existing.recordset[0].password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const query = `
      UPDATE [User]
      SET 
        name = @name,
        email = @email,
        mobileNo = @mobileNo,
        password = @password,
        roleId = @roleId,
        modify_by = @modifyBy,
        modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE user_id = @userId
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int, value: parseInt(id) },
      name: { type: sql.NVarChar, value: name },
      email: { type: sql.NVarChar, value: email },
      mobileNo: { type: sql.NVarChar, value: mobileNo },
      password: { type: sql.NVarChar, value: hashedPassword },
      roleId: { type: sql.Int, value: parseInt(roleId) },
      modifyBy: { type: sql.NVarChar, value: modifyBy },
    });

    console.log('User updated:', result.recordset[0].name);
    res.status(200).json({ success: true, message: 'User updated successfully!', user: result.recordset[0] });
  } catch (err) {
    // console.error('Error updating user:', error);
        next(err);
    if (err.number === 2627) { // Unique constraint violation
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update user', error: err.message });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await executeQuery(
      `SELECT * FROM [User] WHERE user_id = @userId`,
      { userId: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await executeQuery(
      `DELETE FROM [User] WHERE user_id = @userId`,
      { userId: { type: sql.Int, value: parseInt(id) } }
    );

    console.log('User deleted:', result.recordset[0].name);
    res.status(200).json({ success: true, message: 'User deleted successfully!' });
  } catch (err) {
    // console.error('Error deleting user:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to delete user', error: err.message });
  }
});

// Change Password Route
router.put('/change-password', async (req, res, next) => {
  const { email, oldPassword, newPassword, confirmPassword } = req.body;

  try {
    // Validate required fields
    if (!email || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    // Check if new password is different from the old password
    if (newPassword === oldPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from the old password' });
    }

    // Find the user by email
    const result = await executeQuery(
      `SELECT * FROM [User] WHERE email = @email`,
      { email: { type: sql.NVarChar, value: email } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.recordset[0];

    // Check if the old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Old password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await executeQuery(
      `
        UPDATE [User]
        SET 
          password = @password,
          modify_by = @modifyBy,
          modify_on = GETDATE()
        WHERE email = @email
      `,
      {
        email: { type: sql.NVarChar, value: email },
        password: { type: sql.NVarChar, value: hashedNewPassword },
        modifyBy: { type: sql.NVarChar, value: req.user?.name || 'admin' },
      }
    );

    res.status(200).json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    // console.error('Error changing password:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to change password', error: err.message });
  }
});

module.exports = router;
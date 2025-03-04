const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const router = express.Router();

// Add a new user
const addUser = async (req, res) => {
  const { name, email, mobileNo, password, roleId, created_by } = req.body;

  try {
    if (!name || !email || !mobileNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        mobileNo,
        password: hashedPassword,
        roleId: parseInt(roleId),
        created_by: created_by || 'admin',
        created_on: new Date(),
      },
    });

    res.status(201).json({ message: 'User created successfully!', user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user, please try another email', error: error.message });
  }
};

// Fetch all users
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({ message: 'Users fetched successfully!', users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// Fetch all roles
const getAllRoll = async (req, res) => {
  try {
    const role = await prisma.role.findMany();
    res.status(200).json({ message: 'Roles fetched successfully!', role });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Failed to fetch roles', error: error.message });
  }
};

// Fetch a single user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User fetched successfully!', user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

// Update a user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobileNo, password, roleId } = req.body;
  const modifyBy = req.user?.name || 'admin';

  try {
    if (!name || !email || !mobileNo || !roleId) {
      return res.status(400).json({ message: 'All fields are required except password' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { user_id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let hashedPassword = existingUser.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        name,
        email,
        mobileNo,
        password: hashedPassword,
        roleId: parseInt(roleId),
        modify_by: modifyBy,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'User updated successfully!', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { user_id: parseInt(id) },
    });

    res.status(200).json({ message: 'User deleted successfully!' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// Change Password Route
router.put('/change-password', async (req, res) => {
  const { email, oldPassword, newPassword, confirmPassword } = req.body;

  try {
    // Validate required fields
    if (!email || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    // Check if new password is different from the old password
    if (newPassword === oldPassword) {
      return res.status(400).json({ message: 'New password must be different from the old password' });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { email: email },
      data: {
        password: hashedNewPassword,
        modify_by: req.user?.name || 'admin',
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Password changed successfully!' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
});

// Routes
router.post('/users', addUser);
router.get('/getusers', getAllUsers);
router.get('/getrole', getAllRoll);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
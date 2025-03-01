const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const router = express.Router();

// Add a new user
const addUser = async (req, res) => {
  const { name, email, mobileNo, password, roleId, created_by } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !mobileNo || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        mobileNo,
        password: hashedPassword,
        roleId: parseInt(roleId),
        created_by: created_by || 'admin', // Use created_by from the request or default to 'admin'
        created_on: new Date(), // Set created_on to the current date and time
        // Do not include modify_on here
      },
    });

    res.status(201).json({ message: 'User created successfully!', user: newUser });
  } catch (error) {
    console.error('Error creating user:', error); // Log the error
    res.status(500).json({ message: 'Failed to create user', error: error.message });
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

// Fetch a single user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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
  const modifyBy = req.user?.name || 'admin'; // Use logged-in user's name or default to 'admin'

  try {
    // Validate required fields
    if (!name || !email || !mobileNo || !roleId) {
      return res.status(400).json({ message: 'All fields are required except password' });
    }

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { user_id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the password if provided
    let hashedPassword = existingUser.password; // Use existing password by default
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        name,
        email,
        mobileNo,
        password: hashedPassword,
        roleId: parseInt(roleId),
        modify_by: modifyBy, // Set modify_by to the logged-in user's name
      },
    });

    console.log('User updated:', updatedUser);
    res.status(200).json({ message: 'User updated successfully!', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);

    // Handle specific Prisma errors
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

// Routes
router.post('/users', addUser); // Add a new user
router.get('/getusers', getAllUsers); // Fetch all users
router.get('/users/:id', getUserById); // Fetch a single user by ID
router.put('/users/:id', updateUser); // Update a user
router.delete('/users/:id', deleteUser); // Delete a user

module.exports = router;
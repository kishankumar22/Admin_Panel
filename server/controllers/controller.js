// controllers/controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser () {
  // Step 1: Fetch the role
  const roleName = 'Admin'; // Specify the role for the user
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    console.error(`Role "${roleName}" does not exist!`);
    return;
  }

  // Step 2: Check if the user already exists
  const userEmail = 'kumarkishan73001@gmail.com';
  const existingUser  = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!existingUser ) {
    // Step 3: Hash the password
    const hashedPassword = await bcrypt.hash('Kishan@1', 10);

    // Step 4: Create the new user with the associated role
    const newUser  = await prisma.user.create({
      data: {
        name: 'Kishan Kumar',
        email: userEmail,
        mobileNo: '6387478842',
        password: hashedPassword,
        roleId: role.role_id, // Associate the user with the role
      },
    });

    console.log('New user created:', newUser );
  } else {
    console.log('User  already exists:', existingUser );
  }
}

module.exports = { createUser  };
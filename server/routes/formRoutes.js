const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// POST route to handle form submission
router.post('/submit', async (req, res) => {
    const formData = req.body;

    // Validate if the required fields are present
    if (!formData.email || !formData.fullName) {
        return res.status(400).json({ error: 'User email and full name are required!' });
    }

    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'kishan143ku@gmail.com', // Replace with your email
            pass: 'xebu ziey qhca vzxg', // Replace with your email password
        },
    });

    // Email to the user
    const userMailOptions = {
        from: 'kishan143ku@gmail.com',
        to: formData.email,
        subject: 'Registration Successful',
        text: `Hello ${formData.fullName},\n\nYour registration was successful. Here are your details:\n\n` +
              `Full Name: ${formData.fullName}\n` +
              `Father's Name: ${formData.fatherName}\n` +
              `Mother's Name: ${formData.motherName}\n` +
              `Course: ${formData.course}\n` +
              `DOB: ${formData.dob}\n` +
              `Mobile Number: ${formData.mobileNumber}\n\n` +
              `Thank you for registering!`,
    };

    // Email to the admin
    const adminMailOptions = {
        from: 'kishan143ku@gmail.com',
        to: 'faizraza349@gmail.com', // Replace with admin's email
        subject: 'New User Registration',
        text: `A new user has registered with the following details:\n\n` +
              `Full Name: ${formData.fullName}\n` +
              `Father's Name: ${formData.fatherName}\n` +
              `Mother's Name: ${formData.motherName}\n` +
              `Caste: ${formData.caste}\n` +
              `Religion: ${formData.religion}\n` +
              `Category: ${formData.category}\n` +
              `Permanent Address: ${formData.permanentAddress}\n` +
              `Corresponding Address: ${formData.correspondingAddress}\n` +
              `Sex: ${formData.sex}\n` +
              `DOB: ${formData.dob}\n` +
              `Email: ${formData.email}\n` +
              `Mobile Number: ${formData.mobileNumber}\n` +
              `Father's Mobile Number: ${formData.fatherMobileNumber}\n` +
              `Course: ${formData.course}\n\n` +
              `Education Details:\n` +
              `${formData.education.map(edu => 
                  `- ${edu.examination}, Board: ${edu.board}, Year: ${edu.year}, ` +
                  `Overall Percentage: ${edu.overallPercentage}, PCM Percentage: ${edu.pcmPercentage}`
              ).join('\n')}\n\n` +
              `Please review the details.`,
    };

    try {
        // Send email to the user
        await transporter.sendMail(userMailOptions);
        
        // Send email to the admin
        await transporter.sendMail(adminMailOptions);
        // console.log('Emails sent successfully!')

        // Respond to the client
        res.status(200).json({ message: 'Emails sent successfully!' });
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).json({ error: 'Failed to send emails!' });
    }
});

module.exports = router;

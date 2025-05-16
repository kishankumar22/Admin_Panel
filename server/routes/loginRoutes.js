const express = require('express');
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables

const router = express.Router();

// Debug environment variables
// console.log('Email User:', process.env.EMAIL_USER);
// console.log('Email Password:', process.env.EMAIL_PASSWORD);

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Error: EMAIL_USER or EMAIL_PASSWORD is not defined in .env file');
    process.exit(1); // Exit process if credentials are missing
}

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Verify transporter connection on startup
transporter.verify((error) => {
    if (error) {
        console.error('❌ SMTP Connection Error:', error);
    } else {
        // console.log('✅ SMTP Server is ready to send emails');
    }
});

// Store OTPs temporarily (use database or Redis in production)
const otpStore = new Map();

// Generate a 6-digit OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Send OTP email with improved error handling
async function sendOTPEmail(email, otp) {
    try {
        const mailOptions = {
            from: `"Password Verification from Admin Panel" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Login OTP from Admin Panel',
            text: `Your OTP for login is: ${otp}\nThis OTP is valid for 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #2563eb;">Your Login OTP</h2>
                    <p>Please use the following OTP to complete your login:</p>
                    <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">${otp}</div>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${email}`);
    } catch (error) {
        console.error('❌ Email sending error:', error);
        throw new Error(`Failed to send OTP email: ${error.message}`);
    }
}

// User Login Route (first step)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const pool = await db.poolConnect;
        const query = 'SELECT * FROM [user] WHERE email = @email';
        const request = pool.request();
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

        // Generate OTP
        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 600000, // 10 minutes
            attempts: 0,
        });

        // Send OTP email
        await sendOTPEmail(email, otp);

        // Return response without sensitive data
        const { password: _, ...userDetails } = user;

        return res.status(200).json({
            success: true,
            message: 'OTP sent to email',
            user: userDetails,
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({
            error: 'An error occurred during login. Please try again.',
        });
    }
});

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    try {
        const storedOtpData = otpStore.get(email);

        if (!storedOtpData) {
            return res.status(404).json({ error: 'OTP not found or expired' });
        }

        // Check attempts (prevent brute force)
        if (storedOtpData.attempts >= 3) {
            otpStore.delete(email);
            return res.status(429).json({
                error: 'Too many attempts. Please request a new OTP.',
            });
        }

        // Update attempts
        otpStore.set(email, {
            ...storedOtpData,
            attempts: storedOtpData.attempts + 1,
        });

        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'OTP expired' });
        }

        if (otp !== storedOtpData.otp) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }

        // OTP is valid - get user details
        const pool = await db.poolConnect;
        const query = 'SELECT * FROM [user] WHERE email = @email';
        const request = pool.request();
        request.input('email', sql.VarChar, email);

        const result = await request.query(query);
        const user = result.recordset[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.roleId,
            },
            process.env.JWT_SECRET || 'your-strong-secret-key',
            { expiresIn: '1h' }
        );

        // Clear OTP after successful verification
        otpStore.delete(email);

        // Return response without sensitive data
        const { password: _, ...userDetails } = user;

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: userDetails,
        });
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        return res.status(500).json({
            error: 'An error occurred during OTP verification. Please try again.',
        });
    }
});

// Resend OTP Route
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Check if user exists
        const pool = await db.poolConnect;
        const query = 'SELECT id FROM [user] WHERE email = @email';
        const request = pool.request();
        request.input('email', sql.VarChar, email);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate new OTP
        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 600000, // 10 minutes
            attempts: 0,
        });

        // Send OTP email
        await sendOTPEmail(email, otp);

        return res.status(200).json({
            success: true,
            message: 'New OTP sent to email',
        });
    } catch (error) {
        console.error('❌ Resend OTP error:', error);
        return res.status(500).json({
            error: 'Failed to resend OTP. Please try again.',
        });
    }
});

module.exports = router;
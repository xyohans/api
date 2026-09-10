// routes/otpRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const checkUser = require('../models/checkUser');
const { generateToken } = require('../utils/jwt');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use host/port for other providers, see note below
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  const otp = generateOTP();
  const expireAt = Date.now() + 5 * 60 * 1000;

  otpStore.set(email, { otp, expireAt });

  try {
    await transporter.sendMail({
      from: `"ChatApp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your OTP is ${otp}`,
      html: `<div>
              <h1>Welcome to ChatApp</h1>
              <p>Your code is: <b>${otp}</b></p>
              <p>It will expire in 5 minutes.</p>
            </div>`,
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (e) {
    console.error("Failed to send email:", e);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP code',
    });
  }
});

// POST /api/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  const storedOtp = otpStore.get(email);

  if (!storedOtp) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  if (Date.now() > storedOtp.expireAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP has expired' });
  }

  if (storedOtp.otp !== String(otp)) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  try {
    const user = await checkUser(email);

    otpStore.delete(email);

    if (user) {
      const token = generateToken(user);
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        exists: true,
        token,
        user,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        exists: false,
      });
    }
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Set up Nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // 16-character app password
  },
});

// POST /api/book
router.post('/book', (req, res) => {
  console.log('🔍 Incoming booking data:', req.body); // ✅ CORRECT PLACE

  const { name, email, check_in, check_out, guests, room_type } = req.body;

 if (!name || !email) {
    console.error('❌ Missing required fields: name or email');
    return res.status(400).send('Name and email are required!');
  }


  try {
    // Save booking to database
    const stmt = db.prepare(`
      INSERT INTO bookings (name, email, check_in, check_out, guests, room_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(name, email, check_in, check_out, guests, room_type);

    // Send email to guest
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `✅ Your Booking at King Resort is Confirmed`,
      text: `
Dear ${name},

Thank you for booking with King Resort! We're thrilled to welcome you.

🛏 Room: ${room_type}
📅 Check-In: ${check_in}
📅 Check-Out: ${check_out}
👥 Guests: ${guests}

We'll be in touch if we need anything else. See you soon!

– King Resort Team
      `,
    }, (err, info) => {
      if (err) {
        console.error('❌ Guest email failed:', err);
      } else {
        console.log('📨 Guest email sent:', info.response);
      }
    });

    // Send email to admin
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🛎️ New Booking from ${name}`,
      text: `
A new reservation has been made:

Name: ${name}
Email: ${email}
Room Type: ${room_type}
Check-In: ${check_in}
Check-Out: ${check_out}
Guests: ${guests}
      `,
    }, (err, info) => {
      if (err) {
        console.error('❌ Admin email failed:', err);
      } else {
        console.log('📨 Admin email sent:', info.response);
      }
    });

    res.status(200).send('Booking saved!');
  } catch (err) {
    console.error('❌ Booking error:', err);
    res.status(500).send('Something went wrong.');
  }
});

module.exports = router;

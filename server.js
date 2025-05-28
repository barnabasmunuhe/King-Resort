require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Room inventory (you can store this in a DB later)
const ROOM_LIMITS = {
  "Deluxe Ocean View": 5,
  "Executive Cityscape Room": 3, 
  "Family Garden Retreat": 4,
};

// Health check route for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'King Resort API is running!',
    timestamp: new Date().toISOString()
  });
});

// Root route - FIXED: Now returns a proper response
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to King Resort API',
    endpoints: {
      health: '/health',
      admin: '/admin',
      book: 'POST /api/book',
      checkAvailability: 'POST /api/check-availability',
      contact: 'POST /api/contact'
    }
  });
});

// Admin Panel (basic HTTP auth)
app.use('/admin', basicAuth({
  users: { 'admin': 'admin123' },
  challenge: true,
}));

app.get('/admin', (req, res) => {
  try {
    const bookings = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    res.render('admin', { bookings });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// API Routes
app.post("/api/check-availability", (req, res) => {
  const { check_in, check_out, room_type } = req.body;

  if (!check_in || !check_out || !room_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE room_type = ? 
        AND (
          (? < check_out AND ? > check_in)
        )
    `).all(room_type, check_in, check_out);

    const available = bookings.length === 0;
    res.json({ available });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Booking a room
app.post("/api/book", (req, res) => {
  const { name, email, check_in, check_out, guests, room_type } = req.body;

  if (!name || !email || !check_in || !check_out || !guests || !room_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Get current bookings for the selected dates and room type
    const count = db.prepare(`
      SELECT COUNT(*) AS total FROM bookings
      WHERE room_type = ? AND (? < check_out AND ? > check_in)
    `).get(room_type, check_in, check_out).total;

    // Compare against the limit
    const maxRooms = ROOM_LIMITS[room_type] || 0;

    if (count >= maxRooms) {
      return res.status(409).json({ error: "Room not available for selected dates" });
    }

    // Insert booking
    db.prepare(`
      INSERT INTO bookings (name, email, check_in, check_out, guests, room_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(name, email, check_in, check_out, guests, room_type);

    res.json({ success: true });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Handle contact form submissions
app.post("/api/contact", (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: "All fields are required." });
  }

  try {
    db.prepare(`
      INSERT INTO contacts (name, email, subject, message, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(name, email, subject, message);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save contact:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// FIXED: Proper host binding for cloud deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📨 Booking emails will be sent to ${process.env.EMAIL_USER}`);
  console.log(`🏥 Health check available at /health`);
});

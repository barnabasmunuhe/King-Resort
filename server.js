require('dotenv').config();
const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔄 Starting server...');
console.log('🔧 PORT:', PORT);

// Try to initialize database with error handling
let db = null;
let dbError = null;

try {
  console.log('💾 Attempting to connect to database...');
  db = require('./db');
  console.log('✅ Database connected successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  dbError = error.message;
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Serve static files (CSS, JS, images) from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Room inventory
const ROOM_LIMITS = {
  "Deluxe Ocean View": 5,
  "Executive Cityscape Room": 3, 
  "Family Garden Retreat": 4,
};

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'King Resort API is running!',
    database: db ? 'Connected' : 'Failed',
    dbError: dbError || null,
    timestamp: new Date().toISOString()
  });
});

// Root route - serve the main website
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API info route (moved to /api)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to King Resort API',
    database: db ? 'Connected' : 'Failed',
    dbError: dbError || null,
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

app.get('/admin', async (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      error: 'Database not available',
      dbError: dbError 
    });
  }

  try {
    const bookings = await db.getAllBookings();
    res.render('admin', { bookings });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Database query failed',
      details: error.message 
    });
  }
});

// API Routes
app.post("/api/check-availability", async (req, res) => {
  const { check_in, check_out, room_type } = req.body;

  if (!check_in || !check_out || !room_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!db) {
    return res.status(500).json({ 
      error: "Database not available",
      dbError: dbError 
    });
  }

  try {
    const bookings = await db.getBookingsInDateRange(check_in, check_out, room_type);
    const available = bookings.length === 0;
    res.json({ available });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database query failed',
      details: error.message 
    });
  }
});

app.post("/api/book", async (req, res) => {
  const { name, email, check_in, check_out, guests, room_type } = req.body;

  if (!name || !email || !check_in || !check_out || !guests || !room_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!db) {
    return res.status(500).json({ 
      error: "Database not available",
      dbError: dbError 
    });
  }

  try {
    // Get current bookings for the selected dates and room type
    const existingBookings = await db.getBookingsInDateRange(check_in, check_out, room_type);
    const count = existingBookings.length;

    // Compare against the limit
    const maxRooms = ROOM_LIMITS[room_type] || 0;

    if (count >= maxRooms) {
      return res.status(409).json({ error: "Room not available for selected dates" });
    }

    // Insert booking
    const booking = await db.insertBooking(name, email, check_in, check_out, guests, room_type);
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ 
      error: 'Failed to create booking',
      details: error.message 
    });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: "All fields are required." });
  }

  if (!db) {
    return res.status(500).json({ 
      success: false, 
      error: "Database not available",
      dbError: dbError 
    });
  }

  try {
    const contact = await db.insertContact(name, email, subject, message);
    res.json({ success: true, contact });
  } catch (err) {
    console.error("❌ Failed to save contact:", err);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error",
      details: err.message 
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  if (db && db.close) {
    await db.close();
  }
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🏥 Health check available at /health`);
  console.log(`💾 Database status: ${db ? 'Connected' : 'Failed'}`);
  if (dbError) {
    console.log(`❌ Database error: ${dbError}`);
  }
});

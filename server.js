require('dotenv').config();
const express = require('express');
const path = require('path');
// const db = require('./db'); // TEMPORARILY COMMENTED OUT
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔄 Starting server...');
console.log('🔧 PORT:', PORT);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

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
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to King Resort API',
    status: 'Database temporarily disabled for testing',
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
  // Temporarily return mock data instead of database query
  res.json({ 
    message: 'Admin panel - Database temporarily disabled',
    mockBookings: [
      { id: 1, name: 'Test User', room_type: 'Deluxe Ocean View', created_at: new Date() }
    ]
  });
});

// API Routes - Modified to work without database
app.post("/api/check-availability", (req, res) => {
  const { check_in, check_out, room_type } = req.body;

  if (!check_in || !check_out || !room_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Temporarily return available without database check
  res.json({ 
    available: true, 
    message: "Database temporarily disabled - showing as available" 
  });
});

app.post("/api/book", (req, res) => {
  const { name, email, check_in, check_out, guests, room_type } = req.body;

  if (!name || !email || !check_in || !check_out || !guests || !room_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Temporarily return success without database insert
  res.json({ 
    success: true, 
    message: "Booking received (database temporarily disabled)" 
  });
});

app.post("/api/contact", (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: "All fields are required." });
  }

  // Temporarily return success without database insert
  res.json({ 
    success: true, 
    message: "Contact form received (database temporarily disabled)" 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🏥 Health check available at /health`);
  console.log(`⚠️  Database temporarily disabled for testing`);
});

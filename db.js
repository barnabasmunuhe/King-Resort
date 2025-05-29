const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        guests INTEGER,
        room_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Database setup error:', err);
  }
};

// Initialize tables
createTables();

// Database helper functions
const db = {
  // Insert booking
  async insertBooking(name, email, checkIn, checkOut, guests, roomType) {
    const query = `
      INSERT INTO bookings (name, email, check_in, check_out, guests, room_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [name, email, checkIn, checkOut, guests, roomType]);
    return result.rows[0];
  },

  // Get all bookings
  async getAllBookings() {
    const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    return result.rows;
  },

  // Get booking by ID
  async getBookingById(id) {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Check availability (get bookings for date range)
  async getBookingsInDateRange(checkIn, checkOut, roomType = null) {
    let query = `
      SELECT * FROM bookings 
      WHERE (check_in <= $2 AND check_out >= $1)
    `;
    let params = [checkIn, checkOut];
    
    if (roomType) {
      query += ' AND room_type = $3';
      params.push(roomType);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Insert contact
  async insertContact(name, email, subject, message) {
    const query = `
      INSERT INTO contacts (name, email, subject, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [name, email, subject, message]);
    return result.rows[0];
  },

  // Get all contacts
  async getAllContacts() {
    const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    return result.rows;
  },

  // Delete booking
  async deleteBooking(id) {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Update booking
  async updateBooking(id, name, email, checkIn, checkOut, guests, roomType) {
    const query = `
      UPDATE bookings 
      SET name = $2, email = $3, check_in = $4, check_out = $5, guests = $6, room_type = $7
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, name, email, checkIn, checkOut, guests, roomType]);
    return result.rows[0];
  },

  // Close pool connection
  async close() {
    await pool.end();
  }
};

module.exports = db;

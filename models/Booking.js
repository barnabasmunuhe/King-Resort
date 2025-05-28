const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  startDate: Date,
  endDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);

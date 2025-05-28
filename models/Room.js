const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  imageUrl: String,
  available: Boolean
});

module.exports = mongoose.model('Room', roomSchema);

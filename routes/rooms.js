const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all rooms
router.get('/', async (req, res) => {
  const rooms = await Room.find();
  res.json(rooms);
});

// Create a new room
router.post('/', async (req, res) => {
  const room = new Room(req.body);
  await room.save();
  res.status(201).json(room);
});

module.exports = router;

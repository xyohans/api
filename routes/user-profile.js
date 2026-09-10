const express = require('express');
const router = express.Router();
const { createUser, getUserById, updateUser, deleteUser } = require('../models/user');
const jwt = require('../utils/jwt');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-user', async (req, res) => {
  const { name, username, email } = req.body;
  if (!name || !username || !email) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    const user = await createUser(name, username, email);
    const token = jwt.generateToken(user);
    res.status(201).json({ success: true, user, token });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Username or email already exists' });
    }
    console.error('Failed to create user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// GET /profile — identity from token, not query params
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Failed to retrieve user:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user' });
  }
});

// PUT /update — identity from token, email intentionally not editable
router.put('/update', authMiddleware, async (req, res) => {
  const { fullname, username } = req.body;
  if (!fullname || !username) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    const updatedUser = await updateUser(req.user.id, fullname, username);
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }
    console.error('Failed to update user:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// DELETE /delete — identity from token
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    await deleteUser(req.user.id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;
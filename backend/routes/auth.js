const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Keep JWT creation in one place so register and login use the same payload and expiry.
const signToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Return field-level messages for Mongoose validation failures.
const validationResponse = (error) => Object.fromEntries(
  Object.entries(error.errors).map(([field, detail]) => [field, detail.message])
);

// Register a user. The User pre-save hook hashes the password before persistence.
router.post('/register', async (req, res) => {
  try {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      // Do not allow public registration to elevate an account to admin.
      role: 'user',
    });

    const safeUser = user.toObject();
    delete safeUser.password;
    return res.status(201).json({ user: safeUser, token: signToken(user) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed.', errors: validationResponse(error) });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with that email already exists.', errors: { email: 'Email must be unique.' } });
    }
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Unable to register user.' });
  }
});

// Log in with an email and password, returning only a signed token and safe user data.
router.post('/login', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password || ''))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    return res.status(200).json({ user: safeUser, token: signToken(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to log in.' });
  }
});

module.exports = router;

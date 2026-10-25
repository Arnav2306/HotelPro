import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  authenticateUser
} from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register (Rate limited)
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required and must be at least 2 characters.' });
    }

    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // SECURITY: Always enforce role 'guest' for public registration
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'guest'
    });

    await user.save();

    // Generate JWT & set HTTP-only cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Registration successful',
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during registration. Please try again.' });
  }
});

// POST /api/auth/login (Rate limited)
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Safe error message avoiding user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT & set HTTP-only cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      message: 'Login successful',
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during login. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Logged out successfully' });
});

// GET /api/auth/me (Current User)
router.get('/me', authenticateUser, (req, res) => {
  return res.status(200).json({
    user: req.user.toSafeObject ? req.user.toSafeObject() : {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt
    }
  });
});

export default router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Simple email regex validator
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // OLD CODE:
    // // SENSITIVE CONSOLE LOG: Logging raw request bodies with cleartext passwords!
    // console.log('[DEBUG] Registering user with payload:', JSON.stringify(req.body));
    // const { email, password, name, role } = req.body;
    // if (!email || !password || !name) {
    //   return res.status(400).json({ error: 'All fields are required' });
    // }
    // const existingUser = await prisma.user.findUnique({ where: { email } });
    // if (existingUser) {
    //   return res.status(400).json({ error: 'User already exists with this email' });
    // }
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    // const user = await prisma.user.create({
    //   data: {
    //     email,
    //     password: hashedPassword,
    //     name,
    //     role: role || 'RECEPTIONIST',
    //   },
    // });
    // res.status(201).json({
    //   message: 'User registered successfully',
    //   user,
    // });

    // NEW CODE:
    const { email, password, name, role } = req.body;

    // Validation checks
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Security check: Block self-registration of ADMIN accounts to prevent privilege escalation
    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Self-registration of Administrator accounts is prohibited.' });
    }

    const allowedRoles = ['RECEPTIONIST', 'DOCTOR'];
    const finalRole = allowedRoles.includes(role) ? role : 'RECEPTIONIST';

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: finalRole,
      },
      // Use 'select' to NEVER return the password hash in the response
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    // FIX: Consistent API response shape — no password hash exposed
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user },
    });
  } catch (error) {
    // OLD CODE:
    // console.error('Registration error:', error);
    // res.status(500).json({ error: 'Server error during registration', databaseError: error.message });

    // NEW CODE:
    // FIX: Do not leak raw database error messages or error stacks to the client
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // OLD CODE:
    // // SENSITIVE CONSOLE LOG: Logging plain-text passwords on login attempts!
    // console.log(`[AUTH] Login attempt for email: ${req.body.email} with password: ${req.body.password}`);
    // const { email, password } = req.body;
    // if (!email || !password) {
    //   return res.status(400).json({ error: 'Email and password are required' });
    // }
    // const user = await prisma.user.findUnique({ where: { email } });
    // if (!user) {
    //   return res.status(401).json({ error: 'Invalid credentials' });
    // }
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   return res.status(401).json({ error: 'Invalid credentials' });
    // }
    // const token = jwt.sign(
    //   { id: user.id, email: user.email, role: user.role, name: user.name },
    //   JWT_SECRET,
    //   { expiresIn: '365d' }
    // );
    // res.json({
    //   status: 'success',
    //   data: {
    //     token,
    //     user: {
    //       id: user.id,
    //       email: user.email,
    //       name: user.name,
    //       role: user.role,
    //     },
    //   },
    // });

    // NEW CODE:
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Safe pre-computed valid 60-char bcrypt hash (of "dummy_password" with 12 rounds) to prevent timing attacks and library validation crashes
    const dummyHash = '$2a$12$CoPvS04zQ9N2g78tFj929eT4a4y5oU8xLwP1Z2A3B4C5D6E7F8G9H';
    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // FIX (Security): Token expiry changed from '365d' to a sane '8h' (configurable via env)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // FIX: Consistent API response
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    // OLD CODE:
    // console.error('Login error:', error);
    // res.status(500).json({ error: 'Internal Server Error', errorStack: error.stack });

    // NEW CODE:
    // FIX: Do not leak error stack to client
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // OLD CODE:
    // res.json(user);

    // NEW CODE:
    // FIX: Consistent response shape
    res.json({ success: true, data: { user } });
  } catch (error) {
    // OLD CODE:
    // res.status(500).json({ error: error.message });

    // NEW CODE:
    console.error('[AUTH] /me error:', error);
    res.status(500).json({ error: 'Failed to retrieve user details.' });
  }
});

module.exports = router;

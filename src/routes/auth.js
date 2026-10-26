const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function makeToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

router.post('/signup', async (req, res, next) => {
  try {
    let { name, email, password, role = 'worker', headline = '', skills = [], bio = '', hourlyRate = 0, city = '' } = req.body;
    name = String(name || '').trim(); email = String(email || '').trim().toLowerCase();
    if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!['worker', 'client'].includes(role)) return res.status(400).json({ message: 'Role must be worker or client.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const safeSkills = Array.isArray(skills) ? skills.map(s => String(s).trim()).filter(Boolean).slice(0, 30) : [];
    const user = await User.create({ name, email, passwordHash, role, headline, skills: safeSkills, bio, hourlyRate: Number(hourlyRate) || 0, city });
    await Wallet.create({ user: user._id, balancePaise: 0 });
    res.status(201).json({ message: 'Account created successfully.', token: makeToken(user), user });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ message: 'Login successful.', token: makeToken(user), user: user.toJSON() });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'headline', 'skills', 'bio', 'hourlyRate', 'city'];
    for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
    await req.user.save();
    res.json({ message: 'Profile updated.', user: req.user });
  } catch (err) { next(err); }
});
module.exports = router;

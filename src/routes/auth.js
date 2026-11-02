const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


// Generate authentication token
function makeToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}


// ==========================================
// SIGNUP
// ==========================================

router.post('/signup', async (req, res, next) => {
  try {
    let {
      name,
      email,
      password,
      role = 'worker',
      serviceType = '',
      skills = [],
      region = '',
      serviceAreas = [],
      city = '',
      headline = '',
      bio = ''
    } = req.body;

    // Normalize basic fields
    name = String(name || '').trim();
    email = String(email || '').trim().toLowerCase();
    role = String(role || 'worker').trim().toLowerCase();

    city = String(city || '').trim();
    headline = String(headline || '').trim();
    bio = String(bio || '').trim();

    serviceType = String(serviceType || '').trim().toLowerCase();
    region = String(region || '').trim().toLowerCase();

    // Validate name
    if (name.length < 2) {
      return res.status(400).json({
        message: 'Name must be at least 2 characters.'
      });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.'
      });
    }

    // Validate password
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.'
      });
    }

    // Validate account role
    if (!['worker', 'client'].includes(role)) {
      return res.status(400).json({
        message: 'Role must be worker or client.'
      });
    }

    // Check duplicate email
    if (await User.exists({ email })) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    // These fields are used only for worker accounts.
    let safeServiceType = '';
    let safeSkills = [];
    let safeRegion = '';
    let safeServiceAreas = [];

    if (role === 'worker') {
      // Validate worker category
      if (!['digital', 'local'].includes(serviceType)) {
        return res.status(400).json({
          message: 'Choose Digital Worker or Local Worker.'
        });
      }

      // Validate skills
      if (!Array.isArray(skills)) {
        return res.status(400).json({
          message: 'Skills must be provided as a list.'
        });
      }

      safeSkills = [
        ...new Set(
          skills
            .filter(skill => typeof skill === 'string')
            .map(skill => skill.trim())
            .filter(Boolean)
        )
      ].slice(0, 30);

      if (safeSkills.length === 0) {
        return res.status(400).json({
          message: 'Please select at least one skill.'
        });
      }

      safeServiceType = serviceType;

      // Digital worker rules
      if (safeServiceType === 'digital') {
        if (!['north_india', 'south_india'].includes(region)) {
          return res.status(400).json({
            message: 'Digital workers must choose North India or South India.'
          });
        }

        safeRegion = region;
      }

      // Local worker rules
      if (safeServiceType === 'local') {
        if (!Array.isArray(serviceAreas)) {
          return res.status(400).json({
            message: 'Service areas must be provided as a list.'
          });
        }

        safeServiceAreas = [
          ...new Set(
            serviceAreas
              .filter(area => typeof area === 'string')
              .map(area => area.trim())
              .filter(Boolean)
          )
        ].slice(0, 30);

        if (safeServiceAreas.length === 0) {
          return res.status(400).json({
            message: 'Please enter at least one service area.'
          });
        }
      }

      if (!city) {
        return res.status(400).json({
          message: 'Please enter your city.'
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create account
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,

      // Worker profile
      serviceType: role === 'worker' ? safeServiceType : '',
      skills: role === 'worker' ? safeSkills : [],
      region: role === 'worker' ? safeRegion : '',
      serviceAreas: role === 'worker' ? safeServiceAreas : [],

      city: role === 'worker' ? city : '',
      headline: role === 'worker' ? headline : '',
      bio: role === 'worker' ? bio : '',

      // Kept for backward compatibility with existing profiles.
      hourlyRate: 0
    });

    // Create wallet
    await Wallet.create({
      user: user._id,
      balancePaise: 0
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token: makeToken(user),
      user: user.toJSON()
    });

  } catch (err) {
    next(err);
  }
});


// ==========================================
// LOGIN
// ==========================================

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const password = req.body.password;

    const user = await User.findOne({ email })
      .select('+passwordHash');

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(
        String(password || ''),
        user.passwordHash
      ))
    ) {
      return res.status(401).json({
        message: 'Email or password is incorrect.'
      });
    }

    return res.json({
      message: 'Login successful.',
      token: makeToken(user),
      user: user.toJSON()
    });

  } catch (err) {
    next(err);
  }
});


// ==========================================
// GET CURRENT USER
// ==========================================

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user
  });
});


// ==========================================
// UPDATE PROFILE
// ==========================================

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = [
      'name',
      'headline',
      'skills',
      'bio',
      'hourlyRate',
      'city',
      'serviceType',
      'region',
      'serviceAreas'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        req.user[key] = req.body[key];
      }
    }

    await req.user.save();

    return res.json({
      message: 'Profile updated.',
      user: req.user
    });

  } catch (err) {
    next(err);
  }
});


module.exports = router;
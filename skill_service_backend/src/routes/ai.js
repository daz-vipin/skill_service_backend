const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { generateDraft } = require('../services/gemini');
const router = express.Router();
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many AI requests. Try again in a minute.' } });

router.post('/generate', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const prompt = String(req.body.prompt || '').trim();
    const technology = String(req.body.technology || 'General').trim().slice(0, 100);
    if (prompt.length < 3) return res.status(400).json({ message: 'Prompt must be at least 3 characters.' });
    if (prompt.length > 10000) return res.status(400).json({ message: 'Prompt is too long (max 10000 characters).' });
    const output = await generateDraft({ prompt, technology });
    res.json({ output, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });
  } catch (err) { next(err); }
});
module.exports = router;

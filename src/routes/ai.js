const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { generateDraft, generateChatReply } = require('../services/gemini');
const Chat = require('../models/Chat');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many AI requests. Try again in a minute.' }
});

function getUserId(req) {
  return req.user?._id || req.user?.id || req.user?.userId;
}

// Existing AI generation API — preserve it.
router.post('/generate', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const prompt = String(req.body.prompt || '').trim();
    const technology = String(req.body.technology || 'General').trim().slice(0, 100);

    if (prompt.length < 3) {
      return res.status(400).json({ message: 'Prompt must be at least 3 characters.' });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ message: 'Prompt is too long (max 10000 characters).' });
    }

    const output = await generateDraft({ prompt, technology });

    res.json({
      output,
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    });
  } catch (err) {
    next(err);
  }
});

// Get saved chats for the logged-in user.
router.get('/chats', requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unable to identify the logged-in user.' });
    }

    const chats = await Chat.find({ user: userId })
      .select('title technology createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json({ chats });
  } catch (err) {
    next(err);
  }
});

// Start a new chat.
router.post('/chats', requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unable to identify the logged-in user.' });
    }

    const technology = String(req.body.technology || 'General').trim().slice(0, 100) || 'General';

    const chat = await Chat.create({
      user: userId,
      title: 'New Chat',
      technology,
      messages: []
    });

    res.status(201).json({ chat });
  } catch (err) {
    next(err);
  }
});

// Get one saved chat, including its messages.
router.get('/chats/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const chatId = req.params.id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unable to identify the logged-in user.' });
    }

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID.' });
    }

    const chat = await Chat.findOne({ _id: chatId, user: userId }).lean();

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    res.json({ chat });
  } catch (err) {
    next(err);
  }
});

// Send a message, generate a contextual AI reply, and save both messages.
router.post('/chats/:id/messages', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const chatId = req.params.id;
    const message = String(req.body.message || '').trim();

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: 'Unable to identify the logged-in user.' });
    }

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID.' });
    }

    if (message.length < 1) {
      return res.status(400).json({ message: 'Message cannot be empty.' });
    }

    if (message.length > 10000) {
      return res.status(400).json({ message: 'Message is too long (max 10000 characters).' });
    }

    const chat = await Chat.findOne({ _id: chatId, user: userId });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const history = chat.messages.slice(-20).map(item => ({
      role: item.role,
      content: item.content
    }));

    console.log('CHAT HISTORY DEBUG:', JSON.stringify(history.map(m => ({ role: m.role, content: m.content.slice(0, 100) }))));

    const technology = String(req.body.technology || chat.technology || 'General')
      .trim()
      .slice(0, 100) || 'General';

    const output = await generateChatReply({
      message,
      technology,
      history
    });

    chat.technology = technology;
    chat.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: output }
    );

    if (chat.title === 'New Chat') {
      chat.title = message.replace(/\s+/g, ' ').slice(0, 60) || 'New Chat';
    }

    await chat.save();

    res.json({
      chatId: chat._id,
      title: chat.title,
      technology: chat.technology,
      userMessage: message,
      reply: output,
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

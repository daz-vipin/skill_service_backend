const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amountPaise: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'in_progress', 'in_review', 'completed', 'cancelled'], default: 'pending' }
}, { timestamps: true });
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const projects = await Project.find({ $or: [{ client: req.user._id }, { worker: req.user._id }] })
      .populate('client', 'name').populate('worker', 'name headline').sort({ createdAt: -1 }).limit(100);
    res.json({ projects });
  } catch (err) { next(err); }
});
router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'client') return res.status(403).json({ message: 'Only client accounts can create projects.' });
    const { title, description = '', workerId, amountPaise } = req.body;
    if (!title || !workerId || !Number.isSafeInteger(Number(amountPaise)) || Number(amountPaise) < 0) return res.status(400).json({ message: 'title, workerId and amountPaise are required.' });
    const User = require('../models/User');
    const worker = await User.findOne({ _id: workerId, role: 'worker', isActive: true });
    if (!worker) return res.status(404).json({ message: 'Worker not found.' });
    const project = await Project.create({ title, description, client: req.user._id, worker: worker._id, amountPaise: Number(amountPaise) });
    res.status(201).json({ project });
  } catch (err) { next(err); }
});
module.exports = router;

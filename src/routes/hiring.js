const express = require('express');
const mongoose = require('mongoose');

const Hiring = require('../models/HiringModel');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/hiring
 * Client sends a hiring request to a worker.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // Only clients can send hiring requests.
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can send hiring requests.',
      });
    }

    const { workerId, title, description, budget } = req.body;

    // Validate worker ID.
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid worker ID is required.',
      });
    }

    // Validate title.
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.trim().length > 120
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be at most 120 characters.',
      });
    }

    // Validate description.
    if (
      typeof description !== 'string' ||
      !description.trim() ||
      description.trim().length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Description is required and must be at most 2000 characters.',
      });
    }

    // Validate budget.
    const parsedBudget =
      typeof budget === 'number' || typeof budget === 'string'
        ? Number(budget)
        : NaN;

    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid budget of zero or more is required.',
      });
    }

    // Check that the selected user is an active worker.
    const worker = await User.findOne({
      _id: workerId,
      role: 'worker',
      isActive: true,
    }).select('_id');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found or is not active.',
      });
    }

    // Create the hiring request.
    const hiringRequest = await Hiring.create({
      client: req.user._id,
      worker: worker._id,
      title: title.trim(),
      description: description.trim(),
      budget: parsedBudget,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Hiring request sent successfully.',
      hiringRequest,
    });
  } catch (error) {
    console.error('Create hiring request error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create hiring request.',
    });
  }
});


/**
 * GET /api/hiring/my-requests
 * Client views requests they have sent.
 */
router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can view their sent hiring requests.',
      });
    }

    const requests = await Hiring.find({
      client: req.user._id,
    })
      .populate('worker', 'name headline skills city hourlyRate')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Fetch client hiring requests error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch hiring requests.',
    });
  }
});


/**
 * GET /api/hiring/received
 * Worker views hiring requests received from clients.
 */
router.get('/received', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Only workers can view received hiring requests.',
      });
    }

    const requests = await Hiring.find({
      worker: req.user._id,
    })
      .populate('client', 'name city')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Fetch worker hiring requests error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch received hiring requests.',
    });
  }
});


/**
 * PATCH /api/hiring/:id/status
 * Worker accepts or rejects a pending hiring request.
 */
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Only workers can accept or reject hiring requests.',
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate hiring request ID.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hiring request ID.',
      });
    }

    // Only these two status changes are allowed through this endpoint.
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either accepted or rejected.',
      });
    }

    // Update only a pending request belonging to this worker.
    const hiringRequest = await Hiring.findOneAndUpdate(
      {
        _id: id,
        worker: req.user._id,
        status: 'pending',
      },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('client', 'name city')
      .populate('worker', 'name headline');

    if (!hiringRequest) {
      return res.status(404).json({
        success: false,
        message:
          'Pending hiring request not found, or you are not its assigned worker.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Hiring request ${status} successfully.`,
      hiringRequest,
    });
  } catch (error) {
    console.error('Update hiring request status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update hiring request status.',
    });
  }
});


module.exports = router;
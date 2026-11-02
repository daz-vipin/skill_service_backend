
const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');


const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const {
      q = '',
      category = '',
      page = '1',
      limit = '20'
    } = req.query;

    const safeLimit = Math.min(
      Math.max(parseInt(limit, 10) || 20, 1),
      50
    );

    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = {
      role: 'worker',
      isActive: true
    };

    if (category && category.toLowerCase() !== 'all') {
      filter.$or = [
        {
          headline: {
            $regex: escapeRegex(category),
            $options: 'i'
          }
        },
        {
          skills: {
            $elemMatch: {
              $regex: escapeRegex(category),
              $options: 'i'
            }
          }
        }
      ];
    }

    if (q.trim()) {
      const search = {
        $or: [
          {
            name: {
              $regex: escapeRegex(q.trim()),
              $options: 'i'
            }
          },
          {
            headline: {
              $regex: escapeRegex(q.trim()),
              $options: 'i'
            }
          },
          {
            skills: {
              $elemMatch: {
                $regex: escapeRegex(q.trim()),
                $options: 'i'
              }
            }
          },
          {
            bio: {
              $regex: escapeRegex(q.trim()),
              $options: 'i'
            }
          }
        ]
      };

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, search];
      } else {
        Object.assign(filter, search);
      }

      delete filter.$or;
    }

    const [workers, total] = await Promise.all([
      User.find(filter)
        .select(
          'name role headline skills bio hourlyRate city createdAt completedProjects rank'
        )
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),

      User.countDocuments(filter)
    ]);

    res.json({
      workers,
      page: safePage,
      limit: safeLimit,
      total
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const worker = await User.findOne({
      _id: req.params.id,
      role: 'worker',
      isActive: true
    }).select(
      'name role headline skills bio hourlyRate city createdAt completedProjects rank'
    );

    if (!worker) {
      return res.status(404).json({
        message: 'Worker not found.'
      });
    }

    res.json({ worker });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = router;

const express = require('express');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ balancePaise: wallet?.balancePaise || 0, currency: 'INR', transactions });
  } catch (err) { next(err); }
});
// Intentionally no public add-money/withdraw endpoint. Real money movement must be verified by a payment provider webhook.
module.exports = router;

const mongoose = require('mongoose');

const hiringSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    budget: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'in_progress',
        'submitted',
        'completed'
      ],
      default: 'pending',
      index: true
    },

    completedAt: {
      type: Date,
      default: null
    },

    submittedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

hiringSchema.index({ client: 1, createdAt: -1 });
hiringSchema.index({ worker: 1, createdAt: -1 });

module.exports = mongoose.model('Hiring', hiringSchema);
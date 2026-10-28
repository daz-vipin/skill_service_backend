
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ['worker', 'client'],
      default: 'worker',
      index: true
    },

    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },

    skills: {
      type: [String],
      default: []
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: ''
    },

    hourlyRate: {
      type: Number,
      min: 0,
      default: 0
    },

    city: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },

    isActive: {
      type: Boolean,
      default: true
    },

    completedProjects: {
      type: Number,
      default: 0,
      min: 0
    },

    rank: {
      type: String,
      enum: [
        'Beginner',
        'Intermediate',
        'Advanced',
        'Experienced',
        'Expert'
      ],
      default: 'Beginner'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('User', userSchema);

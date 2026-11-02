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

    // Worker type: digital or local
    serviceType: {
      type: String,
      enum: ['digital', 'local', ''],
      default: ''
    },

    // Worker's selected skills
    skills: {
      type: [String],
      default: []
    },

    // Digital workers: north_india or south_india
    region: {
      type: String,
      enum: ['north_india', 'south_india', ''],
      default: ''
    },

    // Worker's city
    city: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },

    // Local workers: manually entered service areas
    serviceAreas: {
      type: [String],
      default: []
    },

    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: ''
    },

    // Retained temporarily for compatibility with existing features.
    // It will not be required or used in the new signup flow.
    hourlyRate: {
      type: Number,
      min: 0,
      default: 0
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
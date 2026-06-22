const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    estimatedCostUSD: {
      type: Number,
      default: 0,
    },
    timeOfDay: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening'],
      default: 'Afternoon',
    },
  },
  { _id: true }
);

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    tier: {
      type: String,
      enum: ['Budget', 'Mid-range', 'Luxury'],
      default: 'Mid-range',
    },
    estimatedCostNightUSD: {
      type: Number,
      required: true,
    },
    rating: {
      type: String,
      default: '4.0/5',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const packingItemSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Documents', 'Clothing', 'Gear', 'Toiletries', 'Other'],
      default: 'Other',
    },
    isPacked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: 1,
    },
    budgetTier: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: [true, 'Budget tier is required'],
    },
    interests: [{
      type: String,
      trim: true,
    }],
    itinerary: [{
      dayNumber: {
        type: Number,
        required: true,
      },
      activities: [activitySchema],
    }],
    hotels: [hotelSchema],
    estimatedBudget: {
      transport: {
        type: Number,
        default: 0,
      },
      accommodation: {
        type: Number,
        default: 0,
      },
      food: {
        type: Number,
        default: 0,
      },
      activities: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    packingList: [packingItemSchema],
    aiGenerationNotes: {
      type: String,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for user-specific queries
tripSchema.index({ userId: 1 });

// Middleware to ensure user data isolation
tripSchema.pre('findOne', function () {
  if (!this.options.userId) {
    console.warn('Warning: No userId provided for Trip query - potential data leak risk');
  }
});

module.exports = mongoose.model('Trip', tripSchema);

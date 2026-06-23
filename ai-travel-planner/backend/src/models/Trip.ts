import mongoose, { Document, Schema } from 'mongoose';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────
const ActivitySchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  estimatedCostUSD: { type: Number, default: 0, min: 0 },
  timeOfDay: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening'],
    default: 'Morning',
  },
});

const ItineraryDaySchema = new Schema({
  dayNumber: { type: Number, required: true, min: 1 },
  activities: [ActivitySchema],
});

const HotelSchema = new Schema({
  name: { type: String, required: true },
  tier: {
    type: String,
    enum: ['Budget', 'Mid-Range', 'Luxury'],
    required: true,
  },
  estimatedCostNightUSD: { type: Number, required: true, min: 0 },
  rating: { type: String, default: 'N/A' },
  amenities: [{ type: String }],
});

const PackingItemSchema = new Schema({
  item: { type: String, required: true },
  category: {
    type: String,
    enum: ['Documents', 'Clothing', 'Gear', 'Electronics', 'Health', 'Other'],
    default: 'Other',
  },
  isPacked: { type: Boolean, default: false },
  essential: { type: Boolean, default: false },
});

// ─── Main Trip Schema ─────────────────────────────────────────────────────────
export interface ITripDocument extends Document {
  userId: mongoose.Types.ObjectId;
  destination: string;
  durationDays: number;
  budgetTier: 'Low' | 'Medium' | 'High';
  interests: string[];
  travelMonth: string;
  itinerary: typeof ItineraryDaySchema[];
  hotels: typeof HotelSchema[];
  estimatedBudget: {
    transport: number;
    accommodation: number;
    food: number;
    activities: number;
    total: number;
  };
  packingList: typeof PackingItemSchema[];
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITripDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Index for fast per-user queries
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: [1, 'Trip must be at least 1 day'],
      max: [30, 'Trip cannot exceed 30 days'],
    },
    budgetTier: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
    },
    interests: [{ type: String, trim: true }],
    travelMonth: {
      type: String,
      default: 'Not specified',
    },
    itinerary: [ItineraryDaySchema],
    hotels: [HotelSchema],
    estimatedBudget: {
      transport: { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    packingList: [PackingItemSchema],
  },
  { timestamps: true }
);

// Ensure a user can't create duplicate trips for the same destination/dates
TripSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ITripDocument>('Trip', TripSchema);

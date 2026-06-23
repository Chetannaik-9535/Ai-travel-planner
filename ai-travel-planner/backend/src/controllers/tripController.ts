import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Trip from '../models/Trip';
import { AuthRequest } from '../types';
import { AppError } from '../utils/AppError';
import {
  generateTripItinerary,
  regenerateSingleDay,
  generatePackingList,
} from '../utils/geminiClient';

// ─── Helper: safely extract a scalar param value ──────────────────────────────
// Express types `req.params[x]` as `string | string[]` in strict mode.
// This helper always returns a plain `string` for router params.
function extractParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

// ─── Helper: verify trip ownership ───────────────────────────────────────────
async function findTripForUser(tripId: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    throw new AppError('Invalid trip ID format', 400);
  }

  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    throw new AppError('Trip not found or you do not have permission to access it', 404);
  }
  return trip;
}

// ─── GET /api/trips — list all user trips ────────────────────────────────────
export const getUserTrips = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trips = await Trip.find({ userId: req.user!.id })
      .select('-itinerary -packingList') // Lightweight list view
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { trips, count: trips.length },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/trips/:id — get single trip ────────────────────────────────────
export const getTripById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await findTripForUser(extractParam(req.params.id), req.user!.id);

    res.status(200).json({
      success: true,
      data: { trip },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/trips/generate — AI trip generation ───────────────────────────
export const generateTrip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { destination, durationDays, budgetTier, interests, travelMonth } = req.body;

    // Validation
    if (!destination || !durationDays || !budgetTier) {
      throw new AppError('Destination, duration, and budget tier are required', 400);
    }
    if (!['Low', 'Medium', 'High'].includes(budgetTier)) {
      throw new AppError('Budget tier must be Low, Medium, or High', 400);
    }
    if (durationDays < 1 || durationDays > 30) {
      throw new AppError('Duration must be between 1 and 30 days', 400);
    }

    console.log(`🤖 Generating trip to ${destination} (${durationDays} days, ${budgetTier})`);

    const aiResult = await generateTripItinerary({
      destination,
      durationDays: Number(durationDays),
      budgetTier,
      interests: Array.isArray(interests) ? interests : [],
      travelMonth: travelMonth || 'Not specified',
    });

    const trip = await Trip.create({
      userId: req.user!.id,
      destination,
      durationDays: Number(durationDays),
      budgetTier,
      interests: Array.isArray(interests) ? interests : [],
      travelMonth: travelMonth || 'Not specified',
      itinerary: aiResult.itinerary,
      hotels: aiResult.hotels,
      estimatedBudget: aiResult.estimatedBudget,
      packingList: aiResult.packingList,
    });

    console.log(`✅ Trip created: ${trip._id}`);

    res.status(201).json({
      success: true,
      message: `Your ${durationDays}-day trip to ${destination} has been created!`,
      data: { trip },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/trips/:id — update trip (activities, packing) ──────────────────
export const updateTrip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await findTripForUser(extractParam(req.params.id), req.user!.id);

    // Only allow updating specific fields (prevent ownership override)
    const allowedUpdates = ['itinerary', 'packingList', 'hotels', 'estimatedBudget'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields provided for update', 400);
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      trip._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      data: { trip: updatedTrip },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/trips/:id/day/:dayNumber — regenerate one day ─────────────────
export const regenerateDay = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await findTripForUser(extractParam(req.params.id), req.user!.id);
    const dayNumber = parseInt(extractParam(req.params.dayNumber), 10);
    const { instruction } = req.body;

    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > trip.durationDays) {
      throw new AppError(`Day number must be between 1 and ${trip.durationDays}`, 400);
    }

    console.log(`🔄 Regenerating Day ${dayNumber} of trip ${trip._id}`);

    const newDay = await regenerateSingleDay({
      destination: trip.destination,
      dayNumber,
      totalDays: trip.durationDays,
      budgetTier: trip.budgetTier,
      interests: trip.interests,
      customInstruction: instruction || `Regenerate Day ${dayNumber} with new activities`,
    });

    // Replace only the specific day in the itinerary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedItinerary = (trip.itinerary as any[]).map((day: any) =>
      day.dayNumber === dayNumber ? { ...day.toObject(), activities: newDay.activities } : day
    );

    const updatedTrip = await Trip.findByIdAndUpdate(
      trip._id,
      { $set: { itinerary: updatedItinerary } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Day ${dayNumber} regenerated successfully`,
      data: { trip: updatedTrip },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/trips/:id/packing — regenerate packing list (creative feature)
export const regeneratePackingList = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await findTripForUser(extractParam(req.params.id), req.user!.id);

    // Build a summary of activities for context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itinerarySummary = (trip.itinerary as any[])
      .flatMap((day: any) => day.activities.map((a: any) => a.title))
      .slice(0, 10)
      .join(', ');

    console.log(`🎒 Regenerating packing list for trip ${trip._id}`);

    const packingList = await generatePackingList({
      destination: trip.destination,
      travelMonth: trip.travelMonth,
      durationDays: trip.durationDays,
      interests: trip.interests,
      itinerarySummary,
    });

    const updatedTrip = await Trip.findByIdAndUpdate(
      trip._id,
      { $set: { packingList } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Packing list updated with AI recommendations',
      data: { trip: updatedTrip },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/trips/:id — delete trip ─────────────────────────────────────
export const deleteTrip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await findTripForUser(extractParam(req.params.id), req.user!.id);
    await Trip.findByIdAndDelete(trip._id);

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
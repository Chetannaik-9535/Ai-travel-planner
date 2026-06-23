

import { Request } from 'express';

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthPayload {
  id: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

// ─── Trip Entities ────────────────────────────────────────────────────────────
export interface IActivity {
  _id?: string;
  title: string;
  description: string;
  estimatedCostUSD: number;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
}

export interface IItineraryDay {
  dayNumber: number;
  activities: IActivity[];
}

export interface IHotel {
  name: string;
  tier: 'Budget' | 'Mid-Range' | 'Luxury';
  estimatedCostNightUSD: number;
  rating: string;
  amenities: string[];
}

export interface IPackingItem {
  _id?: string;
  item: string;
  category: 'Documents' | 'Clothing' | 'Gear' | 'Electronics' | 'Health' | 'Other';
  isPacked: boolean;
  essential: boolean;
}

export interface IEstimatedBudget {
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  total: number;
}

// ─── AI Response ──────────────────────────────────────────────────────────────
export interface GeminiTripResponse {
  itinerary: IItineraryDay[];
  hotels: IHotel[];
  estimatedBudget: IEstimatedBudget;
  packingList: IPackingItem[];
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
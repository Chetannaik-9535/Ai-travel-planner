'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, MapPin, Calendar, Wallet, RefreshCw,
  Loader2, Hotel, Package
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { tripsApi } from '@/lib/api';
import { Trip } from '@/types';
import { AxiosError } from 'axios';
import ItineraryBoard from '@/components/ItineraryBoard';
import HotelSuggestions from '@/components/HotelSuggestions';
import PackingList from '@/components/PackingList';
import BudgetDisplay from '@/components/BudgetDisplay';

const BUDGET_COLORS = {
  Low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  High: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

type ActiveTab = 'itinerary' | 'budget' | 'hotels' | 'packing';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerary');
  const [regeneratingPacking, setRegeneratingPacking] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) router.replace('/login');
  }, [authLoading, token, router]);

  const fetchTrip = useCallback(async () => {
    try {
      const res = await tripsApi.getById(id);
      setTrip(res.data?.data?.trip);
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status === 404) {
        toast.error('Trip not found');
        router.push('/dashboard');
      } else if (error.response?.status !== 401) {
        toast.error('Failed to load trip');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (token) fetchTrip();
  }, [token, fetchTrip]);

  const handleRegeneratePackingList = async () => {
    if (!trip) return;
    setRegeneratingPacking(true);
    const toastId = toast.loading('🎒 AI is updating your packing list...');
    try {
      const res = await tripsApi.regeneratePackingList(trip._id);
      setTrip(res.data?.data?.trip);
      toast.success('Packing list updated!', { id: toastId });
    } catch {
      toast.error('Failed to regenerate packing list', { id: toastId });
    } finally {
      setRegeneratingPacking(false);
    }
  };

  const TABS: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: 'itinerary', label: 'Itinerary', icon: Calendar },
    { key: 'budget', label: 'Budget', icon: Wallet },
    { key: 'hotels', label: 'Hotels', icon: Hotel },
    { key: 'packing', label: 'Packing', icon: Package },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-slate-400">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <h1 className="font-bold text-slate-100 truncate">{trip.destination}</h1>
          </div>
          <span className={`badge border ${BUDGET_COLORS[trip.budgetTier]} text-xs hidden sm:inline-flex`}>
            {trip.budgetTier} Budget
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Trip Info Header */}
        <div className="card p-5 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-lg">{trip.destination}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-slate-800 border border-slate-700 text-slate-300">
                📅 {trip.durationDays} {trip.durationDays === 1 ? 'day' : 'days'}
              </span>
              {trip.travelMonth !== 'Not specified' && (
                <span className="badge bg-slate-800 border border-slate-700 text-slate-300">
                  🗓 {trip.travelMonth}
                </span>
              )}
              <span className={`badge border ${BUDGET_COLORS[trip.budgetTier]}`}>
                {trip.budgetTier} Budget
              </span>
              <span className="badge bg-emerald-900/30 border border-emerald-700/30 text-emerald-400">
                💰 ${trip.estimatedBudget.total.toLocaleString()} est.
              </span>
            </div>
          </div>
          {trip.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
              {trip.interests.map((i) => (
                <span key={i} className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'itinerary' && (
            <ItineraryBoard trip={trip} onTripUpdate={setTrip} />
          )}
          {activeTab === 'budget' && (
            <BudgetDisplay budget={trip.estimatedBudget} durationDays={trip.durationDays} />
          )}
          {activeTab === 'hotels' && (
            <HotelSuggestions hotels={trip.hotels} budgetTier={trip.budgetTier} />
          )}
          {activeTab === 'packing' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">⛈️ Weather-Aware Packing List</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    AI-generated based on {trip.destination}&apos;s climate in {trip.travelMonth} and your planned activities
                  </p>
                </div>
                <button
                  onClick={handleRegeneratePackingList}
                  disabled={regeneratingPacking}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  {regeneratingPacking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </button>
              </div>
              <PackingList trip={trip} onTripUpdate={setTrip} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
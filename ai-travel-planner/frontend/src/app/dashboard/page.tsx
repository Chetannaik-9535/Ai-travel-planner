'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Plus, LogOut, MapPin, Calendar, Wallet, Trash2,
  Sparkles, ArrowRight, Loader2, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { tripsApi } from '@/lib/api';
import { TripSummary, CreateTripFormData } from '@/types';
import { AxiosError } from 'axios';
import CreateTripModal from '@/components/CreateTripModal';

const BUDGET_COLORS = {
  Low: { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  Medium: { text: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  High: { text: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
};

function TripCard({ trip, onDelete }: { trip: TripSummary; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const colors = BUDGET_COLORS[trip.budgetTier];

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete trip to ${trip.destination}? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await tripsApi.delete(trip._id);
      toast.success('Trip deleted');
      onDelete(trip._id);
    } catch {
      toast.error('Failed to delete trip');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Link href={`/trips/${trip._id}`} className="group card p-5 hover:border-slate-700 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 block">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors truncate">
            {trip.destination}
          </h3>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10 flex-shrink-0"
          title="Delete trip"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`badge border ${colors.bg} ${colors.text}`}>
          {trip.budgetTier} Budget
        </span>
        <span className="badge bg-slate-800 border border-slate-700 text-slate-400">
          {trip.durationDays} {trip.durationDays === 1 ? 'day' : 'days'}
        </span>
        {trip.travelMonth && trip.travelMonth !== 'Not specified' && (
          <span className="badge bg-slate-800 border border-slate-700 text-slate-400">
            {trip.travelMonth}
          </span>
        )}
      </div>

      {trip.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {trip.interests.slice(0, 3).map((i) => (
            <span key={i} className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
              {i}
            </span>
          ))}
          {trip.interests.length > 3 && (
            <span className="text-xs text-slate-500">+{trip.interests.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-emerald-400">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-sm font-semibold">${trip.estimatedBudget.total.toLocaleString()}</span>
          <span className="text-xs text-slate-500">est. total</span>
        </div>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          View trip <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="skeleton h-5 w-2/3 mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await tripsApi.getAll();
      setTrips(res.data?.data?.trips || []);
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status !== 401) {
        toast.error('Failed to load trips');
      }
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchTrips();
  }, [token, fetchTrips]);

  const handleCreateTrip = async (formData: CreateTripFormData) => {
    setCreating(true);
    const toastId = toast.loading('🤖 AI is planning your trip...');
    try {
      const res = await tripsApi.generate(formData);
      const newTrip = res.data?.data?.trip;

      toast.success(`Trip to ${newTrip.destination} created!`, { id: toastId });
      setShowModal(false);
      router.push(`/trips/${newTrip._id}`);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      const msg = error.response?.data?.message || 'Failed to generate trip. Please try again.';
      toast.error(msg, { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t._id !== id));
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success('Signed out successfully');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          Loading...
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <span className="font-bold gradient-text">Trao Travel</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">
              Welcome, <span className="text-slate-200 font-medium">{user?.name}</span>
            </span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-1">Your Trips</h1>
            <p className="text-slate-400 text-sm">
              {trips.length > 0
                ? `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} planned`
                : 'No trips yet — create your first one!'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Plan New Trip
          </button>
        </div>

        {/* Stats Bar */}
        {trips.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                label: 'Total Trips',
                value: trips.length,
                icon: MapPin,
                color: 'text-indigo-400',
              },
              {
                label: 'Countries Visited',
                value: new Set(trips.map((t) => t.destination.split(',').pop()?.trim())).size,
                icon: Calendar,
                color: 'text-blue-400',
              },
              {
                label: 'Total Budget Est.',
                value: `$${trips.reduce((sum, t) => sum + t.estimatedBudget.total, 0).toLocaleString()}`,
                icon: Wallet,
                color: 'text-emerald-400',
              },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trip Grid */}
        {loadingTrips ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Plan your first trip</h2>
            <p className="text-slate-400 max-w-md mb-8">
              Tell our AI where you want to go, for how long, and your budget — it will generate a
              complete personalized itinerary in seconds.
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => (
              <TripCard key={trip._id} trip={trip} onDelete={handleDeleteTrip} />
            ))}
          </div>
        )}
      </main>

      {/* Create Trip Modal */}
      {showModal && (
        <CreateTripModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateTrip}
          isLoading={creating}
        />
      )}
    </div>
  );
}
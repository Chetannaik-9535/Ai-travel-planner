'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin, Sparkles, Calendar, DollarSign, Hotel, Package,
  ArrowRight, CheckCircle, Zap
} from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Powered Itineraries',
    desc: 'Gemini AI generates personalized day-by-day plans based on your destination, budget, and interests.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
  },
  {
    icon: DollarSign,
    title: 'Smart Budget Estimation',
    desc: 'Realistic cost breakdowns for transport, accommodation, food, and activities tailored to your budget tier.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: Calendar,
    title: 'Editable Itineraries',
    desc: 'Add activities, remove them, or regenerate any specific day with custom instructions.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: Hotel,
    title: 'Hotel Recommendations',
    desc: 'Budget-matched hotel suggestions with ratings and estimated nightly rates.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
  {
    icon: Package,
    title: 'Weather-Aware Packing',
    desc: 'AI packing assistant cross-references your destination climate and activities to build a smart checklist.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    icon: Zap,
    title: 'Multi-User & Secure',
    desc: 'JWT authentication with strict data isolation. Your trips are private and only visible to you.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
  },
];

const DESTINATIONS = ['Tokyo, Japan', 'Paris, France', 'Bali, Indonesia', 'New York, USA'];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-lg gradient-text">Trao Travel</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary flex items-center gap-2 text-sm">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-2 px-4">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Powered by Google Gemini AI
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Plan your perfect trip{' '}
            <span className="gradient-text">with AI</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate complete day-by-day travel itineraries, realistic budgets, hotel
            recommendations, and smart packing lists — all in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? '/dashboard' : '/register'}
              className="btn-primary text-base py-3 px-8 flex items-center gap-2"
            >
              Start Planning Free <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              No credit card required
            </div>
          </div>

          {/* Destination pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {DESTINATIONS.map((dest) => (
              <span
                key={dest}
                className="bg-slate-900 border border-slate-800 text-slate-400 text-sm px-4 py-1.5 rounded-full"
              >
                ✈️ {dest}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need to travel smarter</h2>
            <p className="text-slate-400">AI-powered features that make trip planning effortless</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div key={feat.title} className="card p-6 hover:border-slate-700 transition-colors">
                <div className={`w-11 h-11 ${feat.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <feat.icon className={`w-6 h-6 ${feat.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to explore the world?
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of travelers who plan smarter with AI.
          </p>
          <Link
            href={user ? '/dashboard' : '/register'}
            className="btn-primary text-base py-3.5 px-10 inline-flex items-center gap-2"
          >
            Create Your First Trip <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-400">Trao AI Travel Planner</span>
          </div>
          <p>Built with Next.js, Express, MongoDB & Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '../../services/api';
import ContestCard from '../../components/ContestCard';
import Loading from '../../components/Loading';
import {
  Trophy,
  Users,
  FileCheck2,
  Sparkles,
  Plus,
  PlayCircle,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function OrganizerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await eventApi.getMyEvents();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load organizer dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <Loading message="Loading organizer metrics..." />;

  const stats = data?.stats || {
    totalContests: 0,
    activeContests: 0,
    upcomingContests: 0,
    completedContests: 0,
    totalParticipants: 0,
    totalSubmissions: 0,
  };

  const contests = data?.contests || [];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Organizer Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your peer-to-peer code swapping competitions, participants, and live evaluations
          </p>
        </div>

        <Link
          to="/organizer/create-contest"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Contest
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contests</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalContests}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> Live Contests
            </span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{stats.activeContests}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <PlayCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Participants</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalParticipants}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submissions</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalSubmissions}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Contests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your Competitions</h2>
          <Link
            to="/organizer/contests"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            View all contests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {contests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Contests Created Yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
              Launch your first peer-to-peer code debugging tournament with custom challenges and anonymous swapping.
            </p>
            <Link
              to="/organizer/create-contest"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" /> Create Your First Contest
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.slice(0, 6).map((c) => (
              <ContestCard key={c.id} contest={c} isOrganizer={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

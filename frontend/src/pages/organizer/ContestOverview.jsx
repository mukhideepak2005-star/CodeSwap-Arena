import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventApi } from '../../services/api';
import Loading from '../../components/Loading';
import {
  Trophy,
  Users,
  Code2,
  Layers,
  Repeat2,
  Award,
  KeyRound,
  Play,
  Settings,
  Lock,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function ContestOverview() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regeneratedPin, setRegeneratedPin] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await eventApi.getEvent(id);
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load contest overview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, [id]);

  const handleRegeneratePin = async () => {
    if (!window.confirm('Regenerate contest PIN? The old PIN will immediately stop working.')) return;
    setIsRegenerating(true);
    try {
      const res = await eventApi.regeneratePin(id);
      if (res.success && res.data?.pin) {
        setRegeneratedPin(res.data.pin);
      }
    } catch (err) {
      alert(err.message || 'Failed to regenerate PIN.');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading) return <Loading message="Loading contest control center..." />;
  if (!data?.contest) return <div className="p-8 text-center text-slate-500">Contest not found.</div>;

  const { contest, rounds = [], isOwner } = data;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Contest Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {contest.visibility === 'private' ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Lock className="w-3 h-3" /> Private Competition
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe className="w-3 h-3" /> Public Competition
              </span>
            )}

            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 uppercase">
              {contest.status}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{contest.name}</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{contest.description}</p>
        </div>

        {/* PIN Management Box */}
        {contest.visibility === 'private' && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white shrink-0 font-mono text-center space-y-1.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Access PIN</span>
            <span className="text-xl font-bold text-amber-400 tracking-widest block">
              {regeneratedPin ? regeneratedPin : '••••••'}
            </span>
            <button
              onClick={handleRegeneratePin}
              disabled={isRegenerating}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-semibold underline block mx-auto"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate / View PIN'}
            </button>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to={`/organizer/contests/${id}/participants`}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Participants</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
              {contest.participant_count || 0} / {contest.max_participants}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to={`/organizer/contests/${id}/code-blocks`}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Code Library</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
              {contest.code_block_count || 0} Challenges
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Code2 className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to={`/organizer/contests/${id}/rounds`}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rounds</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
              {rounds.length} Total
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to={`/organizer/contests/${id}/co-organizers`}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all group flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Co-Organizers</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
              {contest.co_organizer_count || 0} Active
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* Core Workflow Hub Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Competition Management Hub</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Swap Manager Highlight Card */}
          <Link
            to={`/organizer/contests/${id}/swaps`}
            className="md:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-indigo-800 shadow-xl hover:shadow-2xl hover:border-indigo-600 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Core Platform Engine
              </div>
              <h3 className="text-2xl font-bold group-hover:text-indigo-300 transition-colors">
                Manual Anonymous Code Swap Manager
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                Map each participant’s intentionally bugged submission to a peer recipient. Use our derangement algorithm to auto-draft fair non-self assignments, preview mappings, validate bijectivity, and publish atomically to launch the Debugging phase!
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-indigo-400 font-semibold text-xs group-hover:translate-x-1 transition-transform">
              Open Swap Manager <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Quick Actions Column */}
          <div className="flex flex-col gap-4">
            <Link
              to={`/organizer/contests/${id}/assignments`}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Manual Code Assignments
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Assign original challenges before Round 1</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to={`/organizer/contests/${id}/evaluations`}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Evaluations & Manual Review
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Automated hidden tests & mark reviews</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to={`/organizer/contests/${id}/leaderboard`}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Live Contest Leaderboard
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Round-wise & overall rankings</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

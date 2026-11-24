import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { roundApi } from '../../services/api';
import Timer from '../../components/Timer';
import Loading from '../../components/Loading';
import {
  Layers,
  Play,
  Pause,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Repeat2,
  Award,
  Plus,
  AlertCircle
} from 'lucide-react';

const ROUND_STEPS = [
  'preparation',
  'bug_introduction',
  'submission_locked',
  'swap_configuration',
  'debugging',
  'evaluation',
  'results',
  'completed',
];

export default function RoundManager() {
  const { id: eventId } = useParams();
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRounds = async () => {
    try {
      const res = await roundApi.getRounds(eventId);
      if (res.success && res.data) {
        const fetched = res.data.rounds || [];
        setRounds(fetched);
        if (fetched.length > 0 && !selectedRound) {
          setSelectedRound(fetched[0]);
        } else if (selectedRound) {
          const updated = fetched.find((r) => r.id === selectedRound.id);
          if (updated) setSelectedRound(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rounds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [eventId]);

  const handleStartRound = async () => {
    if (!selectedRound) return;
    setActionLoading(true);
    try {
      await roundApi.startRound(selectedRound.id);
      fetchRounds();
    } catch (err) {
      alert(err.message || 'Failed to start round.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!selectedRound) return;
    setActionLoading(true);
    try {
      if (selectedRound.timer_paused_at) {
        await roundApi.resumeRound(selectedRound.id);
      } else {
        await roundApi.pauseRound(selectedRound.id);
      }
      fetchRounds();
    } catch (err) {
      alert(err.message || 'Failed to toggle timer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockSubmissions = async () => {
    if (!selectedRound) return;
    if (!window.confirm('Lock all bug introduction submissions? This will advance the round to Swap Configuration.')) return;
    setActionLoading(true);
    try {
      await roundApi.lockSubmissions(selectedRound.id);
      fetchRounds();
    } catch (err) {
      alert(err.message || 'Failed to lock submissions.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndRound = async (nextStatus) => {
    if (!selectedRound) return;
    setActionLoading(true);
    try {
      await roundApi.endRound(selectedRound.id, { next_status: nextStatus });
      fetchRounds();
    } catch (err) {
      alert(err.message || 'Failed to advance round.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loading message="Loading competition rounds..." />;

  const currentStepIndex = selectedRound ? ROUND_STEPS.indexOf(selectedRound.status) : 0;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Round Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Control competition progression, authoritative timers, submission locks, and phase transitions
          </p>
        </div>

        {/* Round Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRound(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedRound?.id === r.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Round {r.round_number}
            </button>
          ))}
        </div>
      </div>

      {selectedRound && (
        <div className="space-y-6">
          {/* Active Round Control Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                  Active Contest Phase
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Round {selectedRound.round_number}: {selectedRound.round_name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{selectedRound.description}</p>
              </div>

              {/* Timer & Controls */}
              <div className="flex items-center gap-3">
                <Timer
                  initialSeconds={selectedRound.time_remaining_seconds || 0}
                  isPaused={Boolean(selectedRound.timer_paused_at)}
                  status={selectedRound.status}
                />

                {(selectedRound.status === 'bug_introduction' || selectedRound.status === 'debugging') && (
                  <button
                    onClick={handlePauseResume}
                    disabled={actionLoading}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                    title={selectedRound.timer_paused_at ? 'Resume Timer' : 'Pause Timer'}
                  >
                    {selectedRound.timer_paused_at ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Contest Lifecycle Stepper
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {ROUND_STEPS.map((st, idx) => {
                  const isCurrent = selectedRound.status === st;
                  const isDone = currentStepIndex > idx;
                  return (
                    <div
                      key={st}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-md shadow-indigo-600/30'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}
                    >
                      <span className="text-[10px] block font-mono">0{idx + 1}</span>
                      <span className="text-xs capitalize block mt-0.5 leading-tight">
                        {st.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contextual Action Buttons */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Current Action Available:</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRound.status === 'preparation' && 'Assign code challenges to participants, then start the Bug Introduction stage.'}
                  {selectedRound.status === 'bug_introduction' && 'Participants are currently introducing bugs into their assigned code.'}
                  {selectedRound.status === 'submission_locked' && 'Submissions are locked. Proceed to Swap Manager to map submissions to recipients.'}
                  {selectedRound.status === 'swap_configuration' && 'Map submissions in Swap Manager and publish them atomically.'}
                  {selectedRound.status === 'debugging' && 'Participants are debugging their anonymously received code.'}
                  {selectedRound.status === 'evaluation' && 'Automated tests complete. Review submissions and manual marks.'}
                  {selectedRound.status === 'results' && 'All evaluations ready. Publish results to the public leaderboard.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedRound.status === 'preparation' && (
                  <button
                    onClick={handleStartRound}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Bug Introduction
                  </button>
                )}

                {selectedRound.status === 'bug_introduction' && (
                  <button
                    onClick={handleLockSubmissions}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" /> Lock Bug Submissions & Enter Swap
                  </button>
                )}

                {(selectedRound.status === 'submission_locked' || selectedRound.status === 'swap_configuration') && (
                  <Link
                    to={`/organizer/contests/${eventId}/swaps`}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Repeat2 className="w-3.5 h-3.5" /> Open Swap Manager
                  </Link>
                )}

                {selectedRound.status === 'debugging' && (
                  <button
                    onClick={() => handleEndRound('evaluation')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conclude Debugging & Evaluate
                  </button>
                )}

                {selectedRound.status === 'evaluation' && (
                  <Link
                    to={`/organizer/contests/${eventId}/evaluations`}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" /> Review Evaluations & Marks
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

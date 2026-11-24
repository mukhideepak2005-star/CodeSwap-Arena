import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import Timer from '../../components/Timer';
import Loading from '../../components/Loading';
import {
  Code2,
  Repeat2,
  Bug,
  Award,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Trophy
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTask() {
      try {
        const res = await studentApi.getMyTask();
        if (res.success && res.data) {
          setTaskData(res.data);
        }
      } catch (err) {
        console.error('Failed to load student task:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTask();
  }, []);

  if (loading) return <Loading message="Entering student arena..." />;

  const phase = taskData?.phase || 'idle';
  const round = taskData?.round;
  const existingSubmission = taskData?.existingSubmission;

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
            Participant Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || user?.display_name}!
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Enrolled Contest: <span className="font-semibold text-white">{user?.event_name || 'CodeSwap Battle'}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center font-mono shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Your Participant ID</span>
          <span className="text-xl font-extrabold text-indigo-300 block">{user?.participantCode || user?.participant_code}</span>
        </div>
      </div>

      {/* Active Phase Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Competition Stage
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {round ? `Round ${round.round_number}: ${round.round_name}` : 'Contest Preparation'}
            </h2>
          </div>

          {round && (
            <Timer
              initialSeconds={round.server_remaining_seconds || 0}
              isPaused={Boolean(round.timer_paused_at)}
              status={round.status}
            />
          )}
        </div>

        {/* Phase Conditions */}
        {phase === 'bug_introduction' && (
          <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
                <Bug className="w-5 h-5 text-indigo-600" /> Stage 1: Intentional Bug Introduction
              </div>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                You have been assigned a working code challenge. Inspect the algorithm, test it, introduce clever non-trivial bugs, and submit your modified program before the countdown expires.
              </p>
              {existingSubmission && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mt-2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> You have already submitted modified code for this round.
                </div>
              )}
            </div>

            <Link
              to="/student/bug-intro"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 transition-all"
            >
              {existingSubmission ? 'Inspect Submitted Code' : 'Enter Bug Workspace'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {phase === 'waiting_for_swaps' && (
          <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                <Repeat2 className="w-5 h-5 text-amber-600 animate-spin" /> Stage 2: Anonymous Code Swap in Progress
              </div>
              <p className="text-xs text-amber-800 mt-1 max-w-xl">
                The Bug Introduction stage has closed. Your contest organizer is currently generating and publishing anonymous code swaps. The page will notify you as soon as the Debugging stage begins!
              </p>
            </div>
          </div>
        )}

        {phase === 'debugging' && (
          <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Stage 3: Peer Code Debugging
              </div>
              <p className="text-xs text-emerald-800 max-w-xl leading-relaxed">
                You have received an anonymous buggy code submission from a fellow competitor. Read the problem requirements, identify the introduced bugs, fix the implementation, and submit your solution!
              </p>
              {existingSubmission && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mt-2 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Debugging solution submitted!
                </div>
              )}
            </div>

            <Link
              to="/student/debug"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0 transition-all"
            >
              {existingSubmission ? 'Inspect Debug Solution' : 'Enter Debugging Workspace'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {(phase === 'evaluation' || phase === 'results' || phase === 'completed') && (
          <div className="p-6 rounded-2xl bg-purple-50/60 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-purple-900 font-bold text-base">
                <Trophy className="w-5 h-5 text-purple-600" /> Stage 4: Evaluations & Standings
              </div>
              <p className="text-xs text-purple-800 mt-1 max-w-xl">
                Debugging submissions are being evaluated against automated hidden test cases and organizer review. View your scores and leaderboard position!
              </p>
            </div>

            <Link
              to="/student/results"
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 shrink-0 transition-all"
            >
              View Results & Leaderboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

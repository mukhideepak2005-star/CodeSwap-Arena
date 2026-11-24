import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentApi, leaderboardApi } from '../../services/api';
import Leaderboard from '../../components/Leaderboard';
import Loading from '../../components/Loading';
import { Trophy, Award, CheckCircle2, Star, MessageSquare } from 'lucide-react';

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const [resResults, resLb] = await Promise.all([
          studentApi.getMyResults(),
          user?.eventId ? leaderboardApi.getEventLeaderboard(user.eventId) : Promise.resolve({ success: false }),
        ]);

        if (resResults.success && resResults.data) {
          setResults(resResults.data.results || []);
        }
        if (resLb.success && resLb.data) {
          setLeaderboard(resLb.data.leaderboard || []);
        }
      } catch (err) {
        console.error('Failed to load student results:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [user]);

  if (loading) return <Loading message="Calculating competition results..." />;

  const totalAccumulatedScore = results.reduce((sum, r) => sum + parseFloat(r.total_score || 0), 0);

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
            Competition Results
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Performance & Standings
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Participant: <span className="font-semibold text-white">{user?.name} ({user?.participantCode})</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-center font-mono shrink-0">
          <span className="text-[10px] text-indigo-300 uppercase tracking-wider block">Total Score</span>
          <span className="text-3xl font-extrabold text-white block">{totalAccumulatedScore.toFixed(1)}</span>
        </div>
      </div>

      {/* Round-by-Round Result Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" /> Your Round Scores
        </h2>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No round results recorded yet. Scores will appear once evaluations are reviewed by the organizer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Round {r.round_number}: {r.round_name}
                  </h3>
                  <span className="font-mono font-extrabold text-indigo-600 text-lg">
                    {parseFloat(r.total_score || 0).toFixed(1)} / 100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Automated Tests</span>
                    <span className="font-mono font-bold text-slate-800">{parseFloat(r.automated_score || 0).toFixed(1)} / 60</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Code Review</span>
                    <span className="font-mono font-bold text-slate-800">{parseFloat(r.organizer_score || 0).toFixed(1)} / 20</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Explanation</span>
                    <span className="font-mono font-bold text-slate-800">{parseFloat(r.explanation_score || 0).toFixed(1)} / 20</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {r.test_cases_passed} / {r.total_test_cases} Tests Passed
                  </span>
                </div>

                {r.organizer_comments && (
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Organizer Feedback:</span>
                      <p className="mt-0.5 text-slate-700">{r.organizer_comments}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contest Leaderboard */}
      <div className="space-y-4">
        <Leaderboard entries={leaderboard} title="Contest Leaderboard Standings" isRound={false} />
      </div>
    </div>
  );
}

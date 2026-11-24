import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roundApi, assignmentApi } from '../../services/api';
import Loading from '../../components/Loading';
import { GitBranch, Sparkles, CheckCircle2, Lock, AlertCircle, RefreshCw } from 'lucide-react';

export default function ManualAssignments() {
  const { id: eventId } = useParams();
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [availableChallenges, setAvailableChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch rounds for contest
  useEffect(() => {
    async function loadRounds() {
      try {
        const res = await roundApi.getRounds(eventId);
        if (res.success && res.data?.rounds) {
          const list = res.data.rounds;
          setRounds(list);
          if (list.length > 0) {
            setSelectedRoundId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load rounds:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRounds();
  }, [eventId]);

  const fetchAssignments = async () => {
    if (!selectedRoundId) return;
    try {
      const res = await assignmentApi.getAssignments(selectedRoundId);
      if (res.success && res.data) {
        setAssignments(res.data.assignments || []);
        setAvailableChallenges(res.data.availableChallenges || []);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedRoundId]);

  const handleChallengeChange = async (participantId, codeBlockId) => {
    try {
      await assignmentApi.assignChallenge(selectedRoundId, {
        participant_id: participantId,
        code_block_id: codeBlockId,
      });
      fetchAssignments();
    } catch (err) {
      alert(err.message || 'Failed to assign challenge.');
    }
  };

  const handleAutoDistribute = async () => {
    if (!window.confirm('Automatically distribute code challenges evenly among all participants?')) return;
    setSaving(true);
    try {
      await assignmentApi.autoDistribute(selectedRoundId);
      fetchAssignments();
    } catch (err) {
      alert(err.message || 'Auto-distribution failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleLockAssignments = async () => {
    if (!window.confirm('Lock assignments for this round?')) return;
    try {
      await assignmentApi.lockAssignments(selectedRoundId);
      fetchAssignments();
      alert('Assignments locked successfully!');
    } catch (err) {
      alert(err.message || 'Failed to lock assignments.');
    }
  };

  if (loading) return <Loading message="Loading assignment matrix..." />;

  const allAssigned = assignments.length > 0 && assignments.every((a) => a.code_block_id);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manual Code Assignments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign original code challenges to each participant before the Bug Introduction stage starts
          </p>
        </div>

        {/* Round Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {rounds.length > 1 && (
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none"
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  Round {r.round_number}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleAutoDistribute}
            disabled={saving || availableChallenges.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Auto-Distribute Evenly
          </button>

          <button
            onClick={handleLockAssignments}
            disabled={!allAssigned}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
          >
            <Lock className="w-3.5 h-3.5" /> Lock Assignments
          </button>
        </div>
      </div>

      {availableChallenges.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No challenges in this contest's code library yet. You must add challenges before assigning them.</span>
          </div>
          <a
            href={`/organizer/contests/${eventId}/code-blocks`}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs"
          >
            Add Challenges
          </a>
        </div>
      )}

      {/* Assignment Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Participant Code</th>
                <th className="py-3 px-4">Participant Name</th>
                <th className="py-3 px-4">Assigned Code Challenge</th>
                <th className="py-3 px-4 text-center">Language</th>
                <th className="py-3 px-4 text-center">Difficulty</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No participants enrolled in this contest yet. Enroll participants first.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.participant_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {a.participant_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.display_name}</td>
                    <td className="py-3 px-4">
                      <select
                        value={a.code_block_id || ''}
                        onChange={(e) => handleChallengeChange(a.participant_id, e.target.value)}
                        className="w-full max-w-xs px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-600 bg-white"
                      >
                        <option value="">-- Select Code Challenge --</option>
                        {availableChallenges.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.title} ({ch.language.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {a.challenge_language ? (
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {a.challenge_language}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {a.challenge_difficulty ? (
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            a.challenge_difficulty === 'easy'
                              ? 'bg-emerald-50 text-emerald-700'
                              : a.challenge_difficulty === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {a.challenge_difficulty}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {a.code_block_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

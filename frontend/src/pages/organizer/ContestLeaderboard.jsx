import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roundApi, leaderboardApi } from '../../services/api';
import Leaderboard from '../../components/Leaderboard';
import Loading from '../../components/Loading';
import { Trophy, Layers, Sparkles } from 'lucide-react';

export default function ContestLeaderboard() {
  const { id: eventId } = useParams();
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [activeTab, setActiveTab] = useState('round'); // 'round' or 'overall'
  const [roundEntries, setRoundEntries] = useState([]);
  const [overallEntries, setOverallEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load rounds
  useEffect(() => {
    async function loadRounds() {
      try {
        const res = await roundApi.getRounds(eventId);
        if (res.success && res.data?.rounds) {
          const list = res.data.rounds;
          setRounds(list);
          if (list.length > 0) setSelectedRoundId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load rounds:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRounds();
  }, [eventId]);

  // Load round leaderboard
  useEffect(() => {
    async function loadRoundLeaderboard() {
      if (!selectedRoundId) return;
      try {
        const res = await leaderboardApi.getRoundLeaderboard(selectedRoundId);
        if (res.success && res.data) {
          setRoundEntries(res.data.leaderboard || []);
        }
      } catch (err) {
        console.error('Failed to load round leaderboard:', err);
      }
    }
    if (activeTab === 'round') {
      loadRoundLeaderboard();
    }
  }, [selectedRoundId, activeTab]);

  // Load overall leaderboard
  useEffect(() => {
    async function loadOverallLeaderboard() {
      try {
        const res = await leaderboardApi.getEventLeaderboard(eventId);
        if (res.success && res.data) {
          setOverallEntries(res.data.leaderboard || []);
        }
      } catch (err) {
        console.error('Failed to load overall leaderboard:', err);
      }
    }
    if (activeTab === 'overall') {
      loadOverallLeaderboard();
    }
  }, [eventId, activeTab]);

  if (loading) return <Loading message="Loading leaderboard..." />;

  const currentRound = rounds.find((r) => r.id === selectedRoundId);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Competition Leaderboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time standings based on automated hidden tests, debugging speed, and manual marks
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('round')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'round'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Round Standings
          </button>
          <button
            onClick={() => setActiveTab('overall')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overall'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overall Contest Standings
          </button>
        </div>
      </div>

      {activeTab === 'round' && rounds.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Select Round:</span>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none"
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round {r.round_number}: {r.round_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Leaderboard Table View */}
      {activeTab === 'round' ? (
        <Leaderboard
          entries={roundEntries}
          title={`Round ${currentRound?.round_number || 1} Leaderboard`}
          isRound={true}
        />
      ) : (
        <Leaderboard
          entries={overallEntries}
          title="Overall Contest Standings"
          isRound={false}
        />
      )}
    </div>
  );
}

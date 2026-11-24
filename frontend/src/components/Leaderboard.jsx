import React, { useState } from 'react';
import { Trophy, Medal, Search, CheckCircle2, Award } from 'lucide-react';

export default function Leaderboard({ entries = [], title = 'Contest Leaderboard', isRound = false }) {
  const [search, setSearch] = useState('');

  const filtered = entries.filter(
    (e) =>
      e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.participant_code?.toLowerCase().includes(search.toLowerCase())
  );

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center border border-amber-300 shadow-sm text-sm">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center border border-slate-300 shadow-sm text-sm">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-900/10 text-amber-900 font-extrabold flex items-center justify-center border border-amber-700/30 shadow-sm text-sm">
          🥉
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> {title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranked by Total Score, Automated Test Verification, and Speed
          </p>
        </div>

        {/* Search filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participant..."
            className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <th className="py-3 px-4 w-16 text-center">Rank</th>
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-4 text-center">ID</th>
              <th className="py-3 px-4 text-center">Automated (60)</th>
              <th className="py-3 px-4 text-center">Review & Exp (40)</th>
              <th className="py-3 px-4 text-center">Tests Passed</th>
              <th className="py-3 px-4 text-right pr-6">Total Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No scores recorded yet. Results will appear once evaluations are processed.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.participant_id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    row.rank <= 3 ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">{getRankBadge(row.rank)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900">{row.display_name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {row.participant_code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                    {parseFloat(row.automated_score || row.total_auto_score || 0).toFixed(1)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                    {isRound
                      ? (parseFloat(row.organizer_score || 0) + parseFloat(row.explanation_score || 0)).toFixed(1)
                      : parseFloat(row.total_manual_score || 0).toFixed(1)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {row.test_cases_passed !== undefined
                        ? `${row.test_cases_passed} / ${row.total_test_cases}`
                        : `${row.total_tests_passed || 0}`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right pr-6">
                    <span className="font-mono font-extrabold text-base text-indigo-600">
                      {parseFloat(row.total_score || 0).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/api';
import ContestCard from '../../components/ContestCard';
import Loading from '../../components/Loading';
import { Search, Filter, KeyRound, Sparkles, Trophy } from 'lucide-react';

export default function ContestDiscovery() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const fetchContests = async () => {
    setLoading(true);
    try {
      const res = await publicApi.getContests({
        search: search || undefined,
        status: statusFilter || undefined,
        language: languageFilter || undefined,
      });
      if (res.success && res.data) {
        setContests(res.data.contests || []);
      }
    } catch (err) {
      console.error('Failed to load contests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchContests();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, languageFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-8 sm:p-12 mb-10 shadow-2xl">
        <div className="max-w-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Competitive Peer-to-Peer Debugging
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Discover Live & Upcoming Code Competitions
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
            Enter real coding battlegrounds: receive original problems, inject subtle bugs, swap anonymously with peers, and debug your way to the top.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/join-pin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              <KeyRound className="w-4 h-4" /> Have a Private Contest PIN?
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-400" /> Host Your Own Contest
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by contest title or organizer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="">All Statuses</option>
              <option value="live">🔴 Live Now</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Language Filter */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Languages</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="c">C</option>
          </select>
        </div>
      </div>

      {/* Contests Grid */}
      {loading ? (
        <Loading message="Fetching active competitions..." />
      ) : contests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Contests Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            No public contests matched your search or filters. Try adjusting your criteria or join with a private PIN.
          </p>
          <Link
            to="/join-pin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            <KeyRound className="w-4 h-4" /> Enter Contest PIN
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((c) => (
            <ContestCard key={c.id} contest={c} />
          ))}
        </div>
      )}
    </div>
  );
}

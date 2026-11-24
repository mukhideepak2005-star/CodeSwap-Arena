import React, { useState, useEffect } from 'react';
import { adminApi, eventApi } from '../../services/api';
import Loading from '../../components/Loading';
import { Trophy, Lock, Globe, Search, Archive } from 'lucide-react';

export default function AdminContests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchContests = async () => {
    try {
      const res = await adminApi.getContests();
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
    fetchContests();
  }, []);

  const handleArchive = async (id) => {
    if (!window.confirm('Force archive this contest?')) return;
    try {
      await eventApi.archiveEvent(id);
      fetchContests();
    } catch (err) {
      alert(err.message || 'Failed to archive contest.');
    }
  };

  const filtered = contests.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.organizer_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading message="Loading all platform competitions..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Contests</h1>
          <p className="text-xs text-slate-500 mt-1">Global directory of all public and private competitions</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contests..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Contest Title</th>
              <th className="py-3 px-4">Organizer</th>
              <th className="py-3 px-4 text-center">Visibility</th>
              <th className="py-3 px-4 text-center">Participants</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right pr-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  No competitions found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {c.organizer_name} <span className="text-slate-400">({c.organizer_email})</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {c.visibility === 'private' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold">
                    {c.participant_count || 0} / {c.max_participants}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right pr-6">
                    <button
                      onClick={() => handleArchive(c.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Archive
                    </button>
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

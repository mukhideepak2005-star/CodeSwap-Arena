import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Loading from '../../components/Loading';
import { FileText, Shield, Search } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await adminApi.getAuditLogs({ limit: 100 });
        if (res.success && res.data) {
          setLogs(res.data.logs || []);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_role.toLowerCase().includes(search.toLowerCase()) ||
      (l.event_name && l.event_name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <Loading message="Loading security audit trail..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security & Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident record of administrative events, authorization checks, and score modifications
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or role..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 w-48">Timestamp (UTC)</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Contest</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-sans text-xs">
                  No audit logs recorded matching search.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold uppercase text-indigo-600 font-sans text-[11px] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                      {log.actor_role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{log.action}</td>
                  <td className="py-3 px-4 text-slate-600 font-sans">{log.event_name || '—'}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '—'}
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

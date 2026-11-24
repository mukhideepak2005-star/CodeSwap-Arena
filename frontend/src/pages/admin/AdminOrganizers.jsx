import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Loading from '../../components/Loading';
import { UserCheck, Shield, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function AdminOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrganizers = async () => {
    try {
      const res = await adminApi.getOrganizers();
      if (res.success && res.data) {
        setOrganizers(res.data.organizers || []);
      }
    } catch (err) {
      console.error('Failed to load organizers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const handleToggleStatus = async (org) => {
    const nextStatus = !org.is_active;
    const action = nextStatus ? 'activate' : 'suspend';
    const reason = prompt(`Enter reason to ${action} account for ${org.full_name}:`);
    if (reason === null) return;

    try {
      await adminApi.setOrganizerStatus(org.id, { is_active: nextStatus, reason });
      fetchOrganizers();
    } catch (err) {
      alert(err.message || 'Failed to update organizer status.');
    }
  };

  const filtered = organizers.filter(
    (o) =>
      o.full_name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      (o.organization && o.organization.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <Loading message="Loading organizer accounts..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organizer Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">Review, activate, and suspend registered contest organizers</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizers..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Organizer</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Organization</th>
              <th className="py-3 px-4 text-center">Contests Created</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right pr-6">Administrative Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  No organizer accounts found.
                </td>
              </tr>
            ) : (
              filtered.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{org.full_name}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">{org.email}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{org.organization || '—'}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600">{org.contest_count || 0}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        org.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {org.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right pr-6">
                    <button
                      onClick={() => handleToggleStatus(org)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        org.is_active
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {org.is_active ? 'Suspend Account' : 'Activate Account'}
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

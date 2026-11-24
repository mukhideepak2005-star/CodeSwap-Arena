import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Loading from '../../components/Loading';
import {
  Shield,
  Users,
  Trophy,
  PlayCircle,
  FileCheck2,
  Cpu,
  AlertTriangle,
  FileText,
  CheckCircle2
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await adminApi.getDashboard();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <Loading message="Loading platform administration console..." />;

  const analytics = data?.analytics || {};
  const recentLogs = data?.recentLogs || [];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wider text-indigo-400">
          <Shield className="w-4 h-4" /> Superuser Platform Administration
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Platform Overview</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor system health, active competitions, execution metrics, and security audit trails
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Organizers</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{analytics.totalOrganizers || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contests</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{analytics.totalContests || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Live Contests</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{analytics.liveContests || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <PlayCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Code Runs Logged</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{analytics.totalExecutionRuns || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Security & Audit Logs Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Recent Security & Audit Logs
          </h2>
          <a href="/admin/audit-logs" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
            View All Logs →
          </a>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No recent activity logged.</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {log.actor_role}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{log.action}</span>
                    {log.event_name && <span className="text-slate-500 ml-1">in {log.event_name}</span>}
                  </div>
                </div>
                <span className="font-mono text-slate-400 text-[11px]">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

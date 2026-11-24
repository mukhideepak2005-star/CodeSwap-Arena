import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Code2,
  GitBranch,
  Repeat2,
  FileCheck2,
  Award,
  Settings,
  ArrowLeft,
  Shield,
  AlertTriangle,
  FileText,
  UserCheck,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const { id: contestId } = useParams();
  const location = useLocation();

  const isContestView = Boolean(contestId) && location.pathname.includes('/organizer/contests/');
  const isAdmin = user?.role === 'admin';

  if (isAdmin) {
    const adminNav = [
      { name: 'Platform Overview', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Organizers', path: '/admin/organizers', icon: UserCheck },
      { name: 'All Contests', path: '/admin/contests', icon: Trophy },
      { name: 'Abuse Reports', path: '/admin/reports', icon: AlertTriangle },
      { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
      { name: 'Platform Settings', path: '/admin/settings', icon: Settings },
    ];

    return (
      <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
          <Shield className="w-4 h-4" /> Platform Admin Portal
        </div>
        <nav className="space-y-1">
          {adminNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    );
  }

  // Organizer View
  if (isContestView) {
    const contestNav = [
      { name: 'Overview', path: `/organizer/contests/${contestId}`, icon: LayoutDashboard, exact: true },
      { name: 'Participants', path: `/organizer/contests/${contestId}/participants`, icon: Users },
      { name: 'Co-Organizers', path: `/organizer/contests/${contestId}/co-organizers`, icon: UserCheck },
      { name: 'Code Library', path: `/organizer/contests/${contestId}/code-blocks`, icon: Code2 },
      { name: 'Round Manager', path: `/organizer/contests/${contestId}/rounds`, icon: Layers },
      { name: 'Assignments', path: `/organizer/contests/${contestId}/assignments`, icon: GitBranch },
      { name: 'Swap Manager', path: `/organizer/contests/${contestId}/swaps`, icon: Repeat2, highlight: true },
      { name: 'Submissions', path: `/organizer/contests/${contestId}/submissions`, icon: FileCheck2 },
      { name: 'Evaluations', path: `/organizer/contests/${contestId}/evaluations`, icon: Award },
      { name: 'Leaderboard', path: `/organizer/contests/${contestId}/leaderboard`, icon: Trophy },
      { name: 'Contest Settings', path: `/organizer/contests/${contestId}/settings`, icon: Settings },
    ];

    return (
      <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col p-4 shrink-0">
        <NavLink
          to="/organizer/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Contests
        </NavLink>

        <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          Contest Controls
        </div>

        <nav className="space-y-1">
          {contestNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                    : item.highlight
                    ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-800/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-indigo-400' : ''}`} />
                {item.name}
              </div>
              {item.highlight && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 uppercase">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> Core
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    );
  }

  // Default Organizer Dashboard Sidebar
  const generalNav = [
    { name: 'Dashboard Overview', path: '/organizer/dashboard', icon: LayoutDashboard },
    { name: 'My Contests', path: '/organizer/contests', icon: Trophy },
    { name: 'Create Contest', path: '/organizer/create-contest', icon: Sparkles },
    { name: 'Profile Settings', path: '/organizer/profile', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col p-4 shrink-0">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Organizer Navigation
      </div>
      <nav className="space-y-1">
        {generalNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/organizer/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

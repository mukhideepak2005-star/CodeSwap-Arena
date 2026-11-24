import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventApi } from '../../services/api';
import Loading from '../../components/Loading';
import { UserCheck, Plus, Shield, Check, X, Trash2, Mail, AlertCircle } from 'lucide-react';

const PERMISSION_KEYS = [
  { key: 'view_contest', label: 'View Contest Overview' },
  { key: 'manage_participants', label: 'Manage Participants & Credentials' },
  { key: 'manage_code_blocks', label: 'Manage Code Library Challenges' },
  { key: 'manage_rounds', label: 'Manage Rounds & Server Timers' },
  { key: 'configure_assignments', label: 'Assign Challenges' },
  { key: 'configure_swaps', label: 'Configure & Publish Code Swaps' },
  { key: 'view_submissions', label: 'View Participant Submissions' },
  { key: 'evaluate_submissions', label: 'Evaluate Submissions & Review Marks' },
  { key: 'manage_leaderboard', label: 'Manage & Publish Leaderboard' },
];

export default function CoOrganizerManagement() {
  const { id } = useParams();
  const [coOrganizers, setCoOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState({
    view_contest: true,
    manage_participants: true,
    manage_code_blocks: true,
    manage_rounds: false,
    configure_assignments: true,
    configure_swaps: true,
    view_submissions: true,
    evaluate_submissions: true,
    manage_leaderboard: true,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoOrganizers = async () => {
    try {
      const res = await eventApi.getCoOrganizers(id);
      if (res.success && res.data) {
        setCoOrganizers(res.data.coOrganizers || []);
      }
    } catch (err) {
      console.error('Failed to fetch co-organizers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoOrganizers();
  }, [id]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await eventApi.inviteCoOrganizer(id, { email, permissions });
      setInviteModalOpen(false);
      setEmail('');
      fetchCoOrganizers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to invite co-organizer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm('Revoke access for this co-organizer?')) return;
    try {
      await eventApi.removeCoOrganizer(id, memberId);
      fetchCoOrganizers();
    } catch (err) {
      alert(err.message || 'Failed to remove co-organizer.');
    }
  };

  if (loading) return <Loading message="Loading contest co-organizers..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Co-Organizer Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Invite colleagues and teaching assistants to co-manage this competition with granular permissions
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setInviteModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Invite Co-Organizer
        </button>
      </div>

      {/* Co-Organizers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {coOrganizers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No co-organizers added yet. Click 'Invite Co-Organizer' to add teaching assistants or partners.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {coOrganizers.map((co) => {
              const perms = typeof co.permissions === 'string' ? JSON.parse(co.permissions) : co.permissions || {};
              return (
                <div key={co.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{co.full_name || co.invited_email}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Co-Organizer
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{co.invited_email}</p>

                    {/* Permissions summary */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {PERMISSION_KEYS.map((pk) => (
                        <span
                          key={pk.key}
                          className={`text-[10px] px-2 py-0.5 rounded-md border ${
                            perms[pk.key]
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                              : 'bg-slate-50 text-slate-400 border-slate-100 line-through'
                          }`}
                        >
                          {pk.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(co.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors self-start md:self-center"
                    title="Revoke Co-Organizer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Invite Co-Organizer</h3>
            <p className="text-xs text-slate-500 mb-6">Select granular permissions for this co-organizer.</p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Granular Permissions
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50">
                  {PERMISSION_KEYS.map((pk) => (
                    <label key={pk.key} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(permissions[pk.key])}
                        onChange={(e) => setPermissions({ ...permissions, [pk.key]: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>{pk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all mt-2"
              >
                {isSubmitting ? 'Inviting...' : 'Send Co-Organizer Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

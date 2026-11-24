import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventApi } from '../../services/api';
import Loading from '../../components/Loading';
import { Settings, Save, Archive, Trash2, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ContestSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [regeneratedPin, setRegeneratedPin] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    banner_url: '',
    rules: '',
    status: 'upcoming',
  });

  useEffect(() => {
    async function loadContest() {
      try {
        const res = await eventApi.getEvent(id);
        if (res.success && res.data?.contest) {
          const c = res.data.contest;
          setContest(c);
          setFormData({
            name: c.name,
            description: c.description,
            banner_url: c.banner_url || '',
            rules: c.rules || '',
            status: c.status,
          });
        }
      } catch (err) {
        console.error('Failed to load contest settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContest();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await eventApi.updateEvent(id, formData);
      setSuccessMsg('Contest settings saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update contest.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegeneratePin = async () => {
    if (!window.confirm('Regenerate PIN? Any previous PIN distributed to students will become invalid.')) return;
    try {
      const res = await eventApi.regeneratePin(id);
      if (res.success && res.data?.pin) {
        setRegeneratedPin(res.data.pin);
      }
    } catch (err) {
      alert(err.message || 'Failed to regenerate PIN.');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this contest? Archived contests become read-only.')) return;
    try {
      await eventApi.archiveEvent(id);
      navigate('/organizer/contests');
    } catch (err) {
      alert(err.message || 'Failed to archive contest.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contest?')) return;
    try {
      await eventApi.deleteEvent(id);
      navigate('/organizer/contests');
    } catch (err) {
      alert(err.message || 'Failed to delete contest.');
    }
  };

  if (loading) return <Loading message="Loading contest settings..." />;

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Contest Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Update contest details, security PIN, and lifecycle status</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Contest Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Banner Image URL
          </label>
          <input
            type="url"
            value={formData.banner_url}
            onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Contest Rules & Guidelines
          </label>
          <textarea
            rows={4}
            value={formData.rules}
            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 font-sans"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Security & Lifecycle Actions */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Security & Lifecycle Actions
        </h3>

        {/* PIN Regeneration */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Access PIN Management</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Regenerate the 6-digit access PIN for private participants.
            </p>
            {regeneratedPin && (
              <span className="inline-block mt-2 font-mono font-bold text-sm bg-slate-900 text-amber-400 px-3 py-1 rounded-lg">
                New PIN: {regeneratedPin}
              </span>
            )}
          </div>
          <button
            onClick={handleRegeneratePin}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shrink-0"
          >
            Regenerate PIN
          </button>
        </div>

        {/* Archival and Danger Zone */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
          <div>
            <h4 className="text-sm font-bold text-rose-900">Archive or Delete Competition</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Archiving makes the contest read-only while preserving results. Deletion soft-deletes the event.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleArchive}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Archive
            </button>
            <button
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

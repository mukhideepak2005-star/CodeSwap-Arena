import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Loading from '../../components/Loading';
import { Settings, Save, CheckCircle2, Shield } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platform_name: 'CodeSwap Arena',
    tagline: 'Create. Swap. Debug. Win.',
    allow_registrations: true,
    max_contests_per_organizer: 20,
    default_execution_engine: 'judge0',
    maintenance_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await adminApi.getSettings();
        if (res.success && res.data?.settings?.general) {
          setSettings(res.data.settings.general);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await adminApi.updateSettings({ key: 'general', value: settings });
      setSuccessMsg('Platform settings updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update platform settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Loading platform configuration..." />;

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global platform policies and code execution defaults</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Platform Name
          </label>
          <input
            type="text"
            value={settings.platform_name}
            onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Platform Tagline
          </label>
          <input
            type="text"
            value={settings.tagline}
            onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Max Contests per Organizer
            </label>
            <input
              type="number"
              value={settings.max_contests_per_organizer}
              onChange={(e) => setSettings({ ...settings, max_contests_per_organizer: parseInt(e.target.value, 10) })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Default Execution Engine
            </label>
            <select
              value={settings.default_execution_engine}
              onChange={(e) => setSettings({ ...settings, default_execution_engine: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
            >
              <option value="judge0">Judge0 (Cloud / Self-Hosted)</option>
              <option value="sandbox_fallback">Built-in Sandbox Runner</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allow_registrations}
              onChange={(e) => setSettings({ ...settings, allow_registrations: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>Allow new organizer account registrations</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
            <span>Enable Platform Maintenance Mode</span>
          </label>
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
    </div>
  );
}

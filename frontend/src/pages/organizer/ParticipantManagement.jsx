import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { participantApi } from '../../services/api';
import Loading from '../../components/Loading';
import {
  Users,
  Plus,
  Upload,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Search,
  Trash2
} from 'lucide-react';

export default function ParticipantManagement() {
  const { id } = useParams();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState([]);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [csvText, setCsvText] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchParticipants = async () => {
    try {
      const res = await participantApi.getParticipants(id);
      if (res.success && res.data) {
        setParticipants(res.data.participants || []);
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [id]);

  // Single Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setIsSubmitting(true);

    try {
      const res = await participantApi.addParticipant(id, { display_name: displayName, email });
      if (res.success && res.data) {
        setAddModalOpen(false);
        setDisplayName('');
        setEmail('');
        setGeneratedCredentials([res.data]);
        setCredentialsModalOpen(true);
        fetchParticipants();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to add participant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Import
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setIsSubmitting(true);

    try {
      const lines = csvText.trim().split('\n');
      const parsed = [];

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts[0]) {
          parsed.push({
            display_name: parts[0],
            email: parts[1] || null,
          });
        }
      }

      if (parsed.length === 0) {
        throw new Error('No valid participant records found in CSV text.');
      }

      const res = await participantApi.importParticipants(id, parsed);
      if (res.success && res.data?.credentials) {
        setImportModalOpen(false);
        setCsvText('');
        setGeneratedCredentials(res.data.credentials);
        setCredentialsModalOpen(true);
        fetchParticipants();
      }
    } catch (err) {
      setActionError(err.message || 'CSV Import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status toggle
  const handleStatusChange = async (pId, newStatus) => {
    try {
      await participantApi.updateParticipant(pId, { status: newStatus });
      fetchParticipants();
    } catch (err) {
      alert(err.message || 'Failed to update participant status.');
    }
  };

  const filtered = participants.filter(
    (p) =>
      p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.participant_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <Loading message="Loading contest participants..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Participant Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enroll students individually or via CSV import, issue secure credentials, and manage enrollment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActionError('');
              setImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button
            onClick={() => {
              setActionError('');
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Participant
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Total Enrolled: <strong className="text-slate-800">{participants.length}</strong>
        </span>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Participant Code</th>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Bug Submissions</th>
                <th className="py-3 px-4 text-center">Debug Solutions</th>
                <th className="py-3 px-4 text-center">Total Score</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No participants found. Add participants individually or import via CSV.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {p.participant_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.display_name}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{p.email || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-mono font-medium text-slate-700">{p.bug_submissions_count || 0}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-mono font-medium text-slate-700">{p.debug_submissions_count || 0}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-mono font-bold text-indigo-600">{parseFloat(p.total_score || 0).toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border focus:outline-none ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'inactive'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="disqualified">Disqualified</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right pr-6">
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete ${p.display_name}?`)) {
                            try {
                              await participantApi.deleteParticipant(p.id);
                              fetchParticipants();
                            } catch (err) {
                              alert(err.message || 'Cannot delete participant.');
                            }
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Participant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Participant Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Participant</h3>
            <p className="text-xs text-slate-500 mb-6">Generates a unique Participant ID and secure Access Code.</p>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-xs border border-rose-200">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@college.edu"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !displayName.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all mt-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Participant & Issue Code'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setImportModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Import Participants from CSV</h3>
            <p className="text-xs text-slate-500 mb-4">
              Paste rows formatted as <code>Name, Email</code> (one per line). Access codes will be automatically generated.
            </p>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-xs border border-rose-200">
                {actionError}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CSV Data (Name, Email)
                </label>
                <textarea
                  rows={6}
                  required
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Alice Smith, alice@college.edu\nBob Jones, bob@college.edu\nCharlie Brown`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !csvText.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all"
              >
                {isSubmitting ? 'Importing...' : 'Batch Import & Generate Credentials'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* One-Time Credentials Export Modal */}
      {credentialsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setCredentialsModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-600 font-bold text-base mb-1">
              <CheckCircle2 className="w-5 h-5" /> Credentials Issued Successfully!
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Copy or export these credentials now to distribute to your participants. Plain access codes are hashed and cannot be displayed again.
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl mb-4">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-[11px] text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Participant ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Access Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedCredentials.map((c) => (
                    <tr key={c.participant_code}>
                      <td className="py-2 px-3 font-bold text-indigo-600">{c.participant_code}</td>
                      <td className="py-2 px-3 font-sans text-slate-800">{c.display_name}</td>
                      <td className="py-2 px-3 font-bold text-emerald-600">{c.access_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const text = generatedCredentials
                    .map((c) => `${c.participant_code}, ${c.display_name}, ${c.access_code}`)
                    .join('\n');
                  navigator.clipboard.writeText(text);
                  alert('Copied credentials to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setCredentialsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

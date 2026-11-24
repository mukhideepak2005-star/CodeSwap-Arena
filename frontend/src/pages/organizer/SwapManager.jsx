import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { roundApi, swapApi } from '../../services/api';
import Loading from '../../components/Loading';
import {
  Repeat2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Send,
  Eye,
  Lock,
  Layers
} from 'lucide-react';

export default function SwapManager() {
  const { id: eventId } = useParams();
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [eligibleRecipients, setEligibleRecipients] = useState([]);
  const [mappings, setMappings] = useState([]); // array of { modification_submission_id, sender_participant_id, recipient_participant_id }
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Load rounds
  useEffect(() => {
    async function loadRounds() {
      try {
        const res = await roundApi.getRounds(eventId);
        if (res.success && res.data?.rounds) {
          const list = res.data.rounds;
          setRounds(list);
          if (list.length > 0) {
            setSelectedRoundId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load rounds:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRounds();
  }, [eventId]);

  // Load swaps data for selected round
  const fetchSwapsData = async () => {
    if (!selectedRoundId) return;
    try {
      const res = await swapApi.getSwaps(selectedRoundId);
      if (res.success && res.data) {
        const subs = res.data.submissions || [];
        setSubmissions(subs);
        setEligibleRecipients(res.data.eligibleRecipients || []);
        setIsPublished(res.data.isPublished);

        // Prepopulate mappings from existing swap assignments or blank
        const initialMappings = subs.map((s) => ({
          modification_submission_id: s.modification_submission_id,
          sender_participant_id: s.sender_participant_id,
          sender_display_name: s.sender_display_name,
          sender_participant_code: s.sender_participant_code,
          recipient_participant_id: s.recipient_participant_id || '',
        }));
        setMappings(initialMappings);
      }
    } catch (err) {
      console.error('Failed to load swaps:', err);
    }
  };

  useEffect(() => {
    fetchSwapsData();
  }, [selectedRoundId]);

  // Auto-derangement draft generator
  const handleGenerateDraft = async () => {
    try {
      const res = await swapApi.generateDraft(selectedRoundId);
      if (res.success && res.data?.draftMappings) {
        const drafts = res.data.draftMappings;
        const newMappings = submissions.map((s) => {
          const matchedDraft = drafts.find((d) => d.modification_submission_id === s.modification_submission_id);
          return {
            modification_submission_id: s.modification_submission_id,
            sender_participant_id: s.sender_participant_id,
            sender_display_name: s.sender_display_name,
            sender_participant_code: s.sender_participant_code,
            recipient_participant_id: matchedDraft ? matchedDraft.recipient_participant_id : '',
          };
        });
        setMappings(newMappings);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate swap draft.');
    }
  };

  // Recipient change handler
  const handleRecipientChange = (senderId, recipientId) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sender_participant_id === senderId ? { ...m, recipient_participant_id: recipientId } : m
      )
    );
  };

  // Real-time client-side validation
  const validationErrors = [];
  const assignedRecipients = new Set();

  for (const m of mappings) {
    if (!m.recipient_participant_id) {
      validationErrors.push(`Participant ${m.sender_participant_code} does not have a recipient selected.`);
    }
    if (m.sender_participant_id === m.recipient_participant_id) {
      validationErrors.push(`Self-assignment: ${m.sender_participant_code} cannot receive their own code.`);
    }
    if (m.recipient_participant_id) {
      if (assignedRecipients.has(m.recipient_participant_id)) {
        const recipObj = eligibleRecipients.find((r) => r.participant_id === m.recipient_participant_id);
        validationErrors.push(`Duplicate recipient: ${recipObj?.display_name || m.recipient_participant_id} receives multiple code submissions.`);
      }
      assignedRecipients.add(m.recipient_participant_id);
    }
  }

  const isValid = validationErrors.length === 0 && mappings.length > 0;

  // Publish Swaps
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await swapApi.publishSwaps(selectedRoundId, mappings);
      if (res.success) {
        setPublishSuccess(true);
        setConfirmModalOpen(false);
        fetchSwapsData();
      }
    } catch (err) {
      alert(err.message || 'Failed to publish swap assignments.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Loading message="Loading swap manager engine..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Core Competition Engine
            </span>
            {isPublished && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Swaps Published & Live
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manual Anonymous Code Swap Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Map each participant’s modified buggy code to a recipient participant. Swapping is 100% anonymous:
            recipients will only see the problem and code, with no sender identity exposed.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isPublished && (
            <>
              <button
                onClick={handleGenerateDraft}
                disabled={submissions.length < 2}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Auto-Draft Fair Non-Self Swap
              </button>

              <button
                onClick={() => setConfirmModalOpen(true)}
                disabled={!isValid || isPublished}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Publish Swaps & Launch Debugging
              </button>
            </>
          )}
        </div>
      </div>

      {/* Validation Status Banner */}
      {!isPublished && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
            isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">
                {isValid
                  ? 'All Swap Validation Checks Passed!'
                  : `Incomplete Mapping (${validationErrors.length} Issue${validationErrors.length > 1 ? 's' : ''}):`}
              </span>
              {isValid ? (
                <p className="mt-0.5 text-emerald-700">
                  Every participant has exactly one incoming and outgoing submission. No self-assignments detected. Ready to publish.
                </p>
              ) : (
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700 font-sans">
                  {validationErrors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {validationErrors.length > 3 && (
                    <li>...and {validationErrors.length - 3} more issues.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Published Success Alert */}
      {publishSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">Swaps Successfully Published!</span>
              <p className="text-xs text-emerald-700 mt-0.5">
                The contest has moved to the Debugging phase. Real-time notifications have been broadcasted to all enrolled students.
              </p>
            </div>
          </div>
          <Link
            to={`/organizer/contests/${eventId}/rounds`}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs"
          >
            View Round Status
          </Link>
        </div>
      )}

      {/* Swap Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Sender → Recipient Mapping Matrix ({submissions.length} Submissions)
          </span>
          {isPublished && (
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Immutable Published Configuration
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Sender Participant</th>
                <th className="py-3 px-4">Code Challenge</th>
                <th className="py-3 px-4 text-center">Language</th>
                <th className="py-3 px-4 text-center w-12">→</th>
                <th className="py-3 px-4">Assigned Recipient (Debugger)</th>
                <th className="py-3 px-4 text-center">Mapping Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No bug submissions have been received in this round yet. Once participants submit their modified code, they will appear here for swap assignment.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const currentMapping = mappings.find(
                    (m) => m.modification_submission_id === sub.modification_submission_id
                  );
                  const selectedRecipientId = currentMapping?.recipient_participant_id || '';
                  const isSelf = selectedRecipientId === sub.sender_participant_id;

                  return (
                    <tr
                      key={sub.modification_submission_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelf ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {/* Sender */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-slate-900">{sub.sender_display_name}</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold ml-2">
                            {sub.sender_participant_code}
                          </span>
                        </div>
                      </td>

                      {/* Challenge */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-slate-700">{sub.challenge_title}</span>
                      </td>

                      {/* Language */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {sub.language}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        <ArrowRight className="w-4 h-4 mx-auto text-indigo-400" />
                      </td>

                      {/* Recipient Dropdown */}
                      <td className="py-3.5 px-4">
                        {isPublished ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {sub.recipient_display_name || 'Assigned'}
                            </span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                              {sub.recipient_participant_code}
                            </span>
                          </div>
                        ) : (
                          <select
                            value={selectedRecipientId}
                            onChange={(e) =>
                              handleRecipientChange(sub.sender_participant_id, e.target.value)
                            }
                            className={`w-full max-w-xs px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none bg-white transition-colors ${
                              isSelf
                                ? 'border-rose-400 text-rose-700 focus:border-rose-600'
                                : selectedRecipientId
                                ? 'border-slate-200 text-slate-800 focus:border-indigo-600'
                                : 'border-amber-300 text-amber-700 focus:border-amber-500'
                            }`}
                          >
                            <option value="">-- Choose Recipient --</option>
                            {eligibleRecipients.map((recip) => (
                              <option key={recip.participant_id} value={recip.participant_id}>
                                {recip.display_name} ({recip.participant_code})
                                {recip.participant_id === sub.sender_participant_id ? ' [SELF - INVALID]' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <XCircle className="w-3 h-3" /> Self-Assigned
                          </span>
                        ) : selectedRecipientId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Mapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Publish Swaps & Launch Debugging?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will atomically commit all {mappings.length} swap assignments in a secure database transaction,
                anonymously distribute the buggy programs to the assigned recipients, and start the Debugging timer.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Security Guarantee:</p>
              <p>• Recipient students will NEVER see sender names or IDs.</p>
              <p>• Hidden test cases remain protected on the backend.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

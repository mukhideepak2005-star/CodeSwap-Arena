import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roundApi, evaluationApi } from '../../services/api';
import CodeEditor from '../../components/CodeEditor';
import Loading from '../../components/Loading';
import {
  Award,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Shield,
  FileText,
  Sliders
} from 'lucide-react';

export default function OrganizerEvaluations() {
  const { id: eventId } = useParams();
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null);
  const [evalDetails, setEvalDetails] = useState(null);

  // Form states for manual review
  const [orgScore, setOrgScore] = useState(20);
  const [expScore, setExpScore] = useState(20);
  const [comments, setComments] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [evalStatus, setEvalStatus] = useState('completed');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadRounds() {
      try {
        const res = await roundApi.getRounds(eventId);
        if (res.success && res.data?.rounds) {
          const list = res.data.rounds;
          setRounds(list);
          if (list.length > 0) setSelectedRoundId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load rounds:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRounds();
  }, [eventId]);

  const fetchEvaluations = async () => {
    if (!selectedRoundId) return;
    try {
      const res = await evaluationApi.getEvaluations(eventId, { round_id: selectedRoundId });
      if (res.success && res.data) {
        setEvaluations(res.data.evaluations || []);
      }
    } catch (err) {
      console.error('Failed to fetch evaluations:', err);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, [selectedRoundId]);

  const openReviewModal = async (ev) => {
    try {
      const res = await evaluationApi.getEvaluationDetails(ev.id);
      if (res.success && res.data) {
        setSelectedEval(ev);
        setEvalDetails(res.data);
        setOrgScore(parseFloat(ev.organizer_score || 20));
        setExpScore(parseFloat(ev.explanation_score || 20));
        setComments(ev.organizer_comments || '');
        setAdjustReason(ev.score_adjustment_reason || '');
        setEvalStatus(ev.status || 'completed');
        setReviewModalOpen(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load evaluation details.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEval) return;
    setIsSaving(true);

    try {
      await evaluationApi.reviewEvaluation(selectedEval.id, {
        organizer_score: parseFloat(orgScore),
        explanation_score: parseFloat(expScore),
        organizer_comments: comments,
        score_adjustment_reason: adjustReason || 'Standard review',
        status: evalStatus,
      });
      setReviewModalOpen(false);
      fetchEvaluations();
    } catch (err) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Loading message="Loading evaluation panel..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Evaluations & Manual Review</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review automated test case scores, assess bug explanations, and allocate manual marks with audit logging
          </p>
        </div>

        {rounds.length > 1 && (
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none"
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round {r.round_number}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Evaluations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Participant Code</th>
                <th className="py-3 px-4">Participant Name</th>
                <th className="py-3 px-4 text-center">Auto Score (60)</th>
                <th className="py-3 px-4 text-center">Manual Review (20)</th>
                <th className="py-3 px-4 text-center">Explanation (20)</th>
                <th className="py-3 px-4 text-center">Total Score (100)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right pr-6">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No evaluations ready for review in this round.
                  </td>
                </tr>
              ) : (
                evaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {ev.participant_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{ev.participant_name}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                      {parseFloat(ev.automated_score || 0).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {parseFloat(ev.organizer_score || 0).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {parseFloat(ev.explanation_score || 0).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-extrabold text-base text-indigo-600">
                        {parseFloat(ev.total_score || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          ev.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ev.status === 'flagged'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right pr-6">
                      <button
                        onClick={() => openReviewModal(ev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Review & Grade
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Grading Modal */}
      {reviewModalOpen && evalDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full p-6 sm:p-8 relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xl font-bold text-slate-900">
                Evaluation Review: {selectedEval?.participant_name} ({selectedEval?.participant_code})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">{evalDetails.evaluation?.challenge_title}</p>

            <form onSubmit={handleReviewSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Code Comparison (Received Buggy Code vs Corrected Code) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Received Buggy Code:
                  </span>
                  <CodeEditor
                    value={evalDetails.evaluation?.received_buggy_code || ''}
                    language={evalDetails.evaluation?.language}
                    readOnly={true}
                    height="240px"
                    title="Received Buggy Code"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                    Participant's Fixed Code:
                  </span>
                  <CodeEditor
                    value={evalDetails.evaluation?.corrected_code || ''}
                    language={evalDetails.evaluation?.language}
                    readOnly={true}
                    height="240px"
                    title="Submitted Corrected Code"
                  />
                </div>
              </div>

              {/* Bug Explanation */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1">Participant Bug Explanation:</span>
                <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {evalDetails.evaluation?.bug_explanation || 'No explanation provided.'}
                </p>
              </div>

              {/* Automated Test Case Execution Details */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Automated Hidden & Public Test Results:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {evalDetails.testCaseResults?.map((tc, idx) => (
                    <div
                      key={tc.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        tc.is_passed
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {tc.is_passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold">Test #{idx + 1} {tc.is_hidden ? '(Hidden)' : '(Public)'}</span>
                          {tc.error_message && (
                            <p className="text-[10px] text-rose-600 truncate max-w-[200px]">{tc.error_message}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold">
                        {tc.is_passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marks Allocation Inputs */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                  Manual Marks Grading (Max 40 Points)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Organizer Code Review Score (Max 20 pts)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={orgScore}
                      onChange={(e) => setOrgScore(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bug Explanation & Quality Score (Max 20 pts)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={expScore}
                      onChange={(e) => setExpScore(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Score Adjustment Reason (Mandatory for audit trail if adjusting default scores)
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Demonstrated exceptional edge-case fix beyond the intended bug"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organizer Feedback Comments (Visible to student in results)
                  </label>
                  <textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Good debugging technique! Keep an eye on memory constraints..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  {isSaving ? 'Saving Review...' : 'Commit Scores & Update Total'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

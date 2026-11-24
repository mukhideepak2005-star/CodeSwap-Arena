import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roundApi, evaluationApi } from '../../services/api';
import CodeEditor from '../../components/CodeEditor';
import Loading from '../../components/Loading';
import { FileCheck2, Eye, CheckCircle2, Clock, X, Code2 } from 'lucide-react';

export default function OrganizerSubmissions() {
  const { id: eventId } = useParams();
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

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

  const openPreview = async (evalId) => {
    try {
      const res = await evaluationApi.getEvaluationDetails(evalId);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setPreviewModalOpen(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load submission preview.');
    }
  };

  if (loading) return <Loading message="Loading submissions monitor..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Submissions Monitor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time feed of participant debugging solutions and automated test pass rates
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

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Participant Code</th>
                <th className="py-3 px-4">Debugger Name</th>
                <th className="py-3 px-4">Challenge</th>
                <th className="py-3 px-4 text-center">Language</th>
                <th className="py-3 px-4 text-center">Automated Score</th>
                <th className="py-3 px-4 text-center">Tests Passed</th>
                <th className="py-3 px-4 text-right pr-6">Inspect Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No debugging submissions recorded in this round yet.
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
                    <td className="py-3 px-4 text-xs text-slate-600 font-medium">{ev.challenge_title}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {ev.language}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                      {parseFloat(ev.automated_score || 0).toFixed(1)} / 60
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {ev.test_cases_passed} / {ev.total_test_cases} Passed
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right pr-6">
                      <button
                        onClick={() => openPreview(ev.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Code
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Inspection Modal */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 sm:p-8 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Submission Review: {previewData.evaluation?.participant_name} ({previewData.evaluation?.participant_code})
            </h3>
            <p className="text-xs text-slate-500 mb-4">{previewData.evaluation?.challenge_title}</p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Corrected Code */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Corrected Code Submitted:
                </span>
                <CodeEditor
                  value={previewData.evaluation?.corrected_code || ''}
                  language={previewData.evaluation?.language}
                  readOnly={true}
                  height="260px"
                  title="Corrected Solution"
                />
              </div>

              {/* Bug Explanation */}
              {previewData.evaluation?.bug_explanation && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-1">Participant Bug Explanation:</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">
                    {previewData.evaluation.bug_explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

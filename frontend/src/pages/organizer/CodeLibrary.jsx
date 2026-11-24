import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { codeBlockApi } from '../../services/api';
import CodeEditor from '../../components/CodeEditor';
import Loading from '../../components/Loading';
import { Code2, Plus, Edit3, Trash2, Check, X, Shield, Eye, AlertCircle } from 'lucide-react';

export default function CodeLibrary() {
  const { id: eventId } = useParams();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'python',
    difficulty: 'easy',
    original_code: '',
    input_format: '',
    expected_output: '',
    time_limit_ms: 2000,
    marks: 100,
    test_cases: [
      { input_data: '', expected_output: '', is_hidden: false, marks: 10 },
      { input_data: '', expected_output: '', is_hidden: true, marks: 25 },
    ],
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChallenges = async () => {
    try {
      const res = await codeBlockApi.getCodeBlocks({ event_id: eventId });
      if (res.success && res.data) {
        setChallenges(res.data.codeBlocks || []);
      }
    } catch (err) {
      console.error('Failed to fetch code library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [eventId]);

  const openCreateModal = () => {
    setEditingBlock(null);
    setFormData({
      title: '',
      description: '',
      language: 'python',
      difficulty: 'easy',
      original_code: `def solution():\n    pass\n\nif __name__ == '__main__':\n    pass\n`,
      input_format: '',
      expected_output: '',
      time_limit_ms: 2000,
      marks: 100,
      test_cases: [
        { input_data: '', expected_output: '', is_hidden: false, marks: 10 },
        { input_data: '', expected_output: '', is_hidden: true, marks: 25 },
      ],
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = async (block) => {
    try {
      const res = await codeBlockApi.getCodeBlock(block.id);
      if (res.success && res.data) {
        setEditingBlock(block);
        const { codeBlock, testCases = [] } = res.data;
        setFormData({
          title: codeBlock.title,
          description: codeBlock.description,
          language: codeBlock.language,
          difficulty: codeBlock.difficulty,
          original_code: codeBlock.original_code,
          input_format: codeBlock.input_format || '',
          expected_output: codeBlock.expected_output || '',
          time_limit_ms: codeBlock.time_limit_ms || 2000,
          marks: codeBlock.marks || 100,
          test_cases: testCases.length > 0 ? testCases : [{ input_data: '', expected_output: '', is_hidden: false, marks: 10 }],
        });
        setErrorMsg('');
        setModalOpen(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load challenge details.');
    }
  };

  const handleAddTestCase = () => {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input_data: '', expected_output: '', is_hidden: true, marks: 10 }],
    });
  };

  const handleRemoveTestCase = (index) => {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, i) => i !== index),
    });
  };

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...formData.test_cases];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, test_cases: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (editingBlock) {
        await codeBlockApi.updateCodeBlock(editingBlock.id, { ...formData, event_id: eventId });
      } else {
        await codeBlockApi.createCodeBlock({ ...formData, event_id: eventId });
      }
      setModalOpen(false);
      fetchChallenges();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm('Delete this code challenge from the library?')) return;
    try {
      await codeBlockApi.deleteCodeBlock(blockId);
      fetchChallenges();
    } catch (err) {
      alert(err.message || 'Failed to delete challenge.');
    }
  };

  if (loading) return <Loading message="Loading challenge library..." />;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Code Challenge Library</h1>
          <p className="text-xs text-slate-500 mt-1">
            Original code blocks and hidden test cases for participant bug introduction and debugging
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New Code Challenge
        </button>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <Code2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Challenges in Library</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Add your first programming challenge with original code and test cases.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Add Challenge
            </button>
          </div>
        ) : (
          challenges.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {c.language}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      c.difficulty === 'easy'
                        ? 'bg-emerald-50 text-emerald-700'
                        : c.difficulty === 'medium'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {c.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">{c.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-3 mb-4 leading-relaxed">{c.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  <strong className="text-slate-800">{c.total_test_cases || 0}</strong> Test Cases ({c.hidden_test_cases || 0} hidden)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit Challenge"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Challenge"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Challenge Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 sm:p-8 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingBlock ? 'Edit Code Challenge' : 'New Code Challenge'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter original source code and configure public & hidden test cases for automated scoring.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Reverse Linked List in Pairs"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Language *
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:border-indigo-600"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Problem Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail the algorithm, constraints, and instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 resize-none font-sans"
                />
              </div>

              {/* Monaco Editor for Original Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Original Source Code (Working Algorithm) *
                </label>
                <CodeEditor
                  value={formData.original_code}
                  onChange={(code) => setFormData({ ...formData, original_code: code })}
                  language={formData.language}
                  height="260px"
                  title="Original Solution"
                />
              </div>

              {/* Test Cases Manager */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Automated Test Cases
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Test Case
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.test_cases.map((tc, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">Test Case #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                            <input
                              type="checkbox"
                              checked={tc.is_hidden}
                              onChange={(e) => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            <Shield className="w-3 h-3 text-amber-500" /> Hidden Test
                          </label>
                          {formData.test_cases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Standard Input:</span>
                          <textarea
                            rows={2}
                            value={tc.input_data}
                            onChange={(e) => handleTestCaseChange(idx, 'input_data', e.target.value)}
                            placeholder="Input stdin..."
                            className="w-full p-2 rounded-lg border border-slate-200 bg-white resize-none text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Expected Output:</span>
                          <textarea
                            rows={2}
                            value={tc.expected_output}
                            onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                            placeholder="Expected stdout..."
                            className="w-full p-2 rounded-lg border border-slate-200 bg-white resize-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting ? 'Saving...' : 'Save Challenge to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

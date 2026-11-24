import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentApi, executionApi } from '../../services/api';
import CodeEditor from '../../components/CodeEditor';
import OutputPanel from '../../components/OutputPanel';
import Timer from '../../components/Timer';
import Loading from '../../components/Loading';
import {
  ShieldCheck,
  Play,
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function DebugWorkspace() {
  const [taskData, setTaskData] = useState(null);
  const [code, setCode] = useState('');
  const [bugExplanation, setBugExplanation] = useState('');
  const [loading, setLoading] = useState(true);

  // Execution states
  const [customInput, setCustomInput] = useState('');
  const [execResult, setExecResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadTask() {
      try {
        const res = await studentApi.getMyTask();
        if (res.success && res.data) {
          setTaskData(res.data);
          const received = res.data.task?.received_buggy_code || '';
          const existing = res.data.existingSubmission?.corrected_code;
          setCode(existing || received);
          if (existing) {
            setSubmitted(true);
            setBugExplanation(res.data.existingSubmission?.bug_explanation || '');
          }
        }
      } catch (err) {
        console.error('Failed to load debug task:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTask();
  }, []);

  const handleRunCode = async () => {
    if (!taskData?.task) return;
    setIsRunning(true);
    setErrorMsg('');

    try {
      const res = await executionApi.runCode({
        language: taskData.task.language,
        source_code: code,
        stdin: customInput,
        code_block_id: taskData.task.code_block_id,
        event_id: taskData.round?.event_id,
      });

      if (res.success && res.data) {
        setExecResult(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitDebugSolution = async () => {
    if (!window.confirm('Submit your final debugging solution? Automated hidden tests will evaluate it immediately.')) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await studentApi.submitDebuggingSolution({
        swap_assignment_id: taskData.task.swap_assignment_id,
        round_id: taskData.round.id,
        code_block_id: taskData.task.code_block_id,
        corrected_code: code,
        bug_explanation: bugExplanation,
        language: taskData.task.language,
      });

      if (res.success && res.data) {
        setSubmitted(true);
        setEvalResult(res.data.evaluation);
        alert('Debugging solution successfully submitted and evaluated!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loading message="Entering anonymous debugging arena..." />;
  if (!taskData?.task) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200">
        <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">No Debugging Task Available</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{taskData?.message || 'Round is not in Debugging stage.'}</p>
        <Link to="/student/dashboard" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { task, round } = taskData;

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-4">
      {/* Workspace Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/student/dashboard"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {task.language}
              </span>
              <span className="text-xs font-bold text-slate-400">• Round {round?.round_number} Stage 2 (Debug)</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                Anonymous ID: {task.anonymous_challenge_id}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">{task.title}</h1>
          </div>
        </div>

        {/* Timer & Submit Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Timer
            initialSeconds={round?.server_remaining_seconds || 0}
            isPaused={Boolean(round?.timer_paused_at)}
            status={round?.status}
          />

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-current'}`} />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>

          <button
            onClick={handleSubmitDebugSolution}
            disabled={isSubmitting || submitted}
            className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all ${
              submitted
                ? 'bg-emerald-600 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            {submitted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Final Fix Submitted
              </>
            ) : isSubmitting ? (
              'Evaluating Tests...'
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Submit Debug Solution
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Challenge Specs & Instructions (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Debugging Task
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-sans bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                You have received an <strong>anonymously swapped program</strong>. Your peer modified this code to introduce bugs. Analyze the implementation, spot the errors, fix them, and explain the bug below.
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Problem Requirements
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>

            {task.input_format && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Expected Input Format
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {task.input_format}
                </p>
              </div>
            )}

            {task.expected_output && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Expected Output Format
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {task.expected_output}
                </p>
              </div>
            )}

            {/* Public Test Cases Preview */}
            {task.public_test_cases?.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Sample Public Test Cases
                </span>
                <div className="space-y-2">
                  {task.public_test_cases.map((tc, idx) => (
                    <div key={tc.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block font-bold">Sample #{idx + 1}</span>
                      <div className="text-slate-600">
                        Input: <span className="text-slate-900 font-bold">{tc.input_data}</span>
                      </div>
                      <div className="text-slate-600">
                        Output: <span className="text-emerald-600 font-bold">{tc.expected_output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Panel & Explanation (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CodeEditor
            value={code}
            onChange={(val) => !submitted && setCode(val)}
            language={task.language}
            readOnly={submitted}
            height="380px"
            title="Debug Swapped Code Here"
          />

          {/* Bug Explanation Input Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bug Explanation & Debugging Rationale (Worth up to 20 Marks)
            </label>
            <textarea
              rows={3}
              disabled={submitted}
              value={bugExplanation}
              onChange={(e) => setBugExplanation(e.target.value)}
              placeholder="Explain where the bug was located in the received code, what caused it, and how your fix resolves it..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-sans focus:outline-none focus:border-indigo-600 resize-none disabled:bg-slate-50"
            />
          </div>

          <OutputPanel
            stdout={execResult?.stdout}
            stderr={execResult?.stderr}
            compileOutput={execResult?.compile_output}
            status={execResult?.status}
            executionTimeMs={execResult?.execution_time_ms}
            customInput={customInput}
            onCustomInputChange={setCustomInput}
            isRunning={isRunning}
            onRun={handleRunCode}
          />
        </div>
      </div>
    </div>
  );
}

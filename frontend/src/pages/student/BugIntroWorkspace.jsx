import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentApi, executionApi } from '../../services/api';
import CodeEditor from '../../components/CodeEditor';
import OutputPanel from '../../components/OutputPanel';
import Timer from '../../components/Timer';
import Loading from '../../components/Loading';
import {
  Bug,
  Play,
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileCode2,
  BookOpen
} from 'lucide-react';

export default function BugIntroWorkspace() {
  const [taskData, setTaskData] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  // Execution states
  const [customInput, setCustomInput] = useState('');
  const [execResult, setExecResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadTask() {
      try {
        const res = await studentApi.getMyTask();
        if (res.success && res.data) {
          setTaskData(res.data);
          const orig = res.data.task?.original_code || '';
          const existing = res.data.existingSubmission?.modified_code;
          setCode(existing || orig);
          if (existing) setSubmitted(true);
        }
      } catch (err) {
        console.error('Failed to load bug intro task:', err);
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

  const handleSubmitModifiedCode = async () => {
    if (!window.confirm('Submit your modified buggy code? Once submitted, your code is recorded for the swap.')) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await studentApi.submitModifiedCode({
        round_id: taskData.round.id,
        code_block_id: taskData.task.code_block_id,
        modified_code: code,
      });

      if (res.success) {
        setSubmitted(true);
        alert('Buggy code modification successfully submitted!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!submitted && taskData?.task?.original_code) {
      setCode(taskData.task.original_code);
    }
  };

  if (loading) return <Loading message="Loading code workspace..." />;
  if (!taskData?.task) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200">
        <Bug className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">No Bug Introduction Task Available</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{taskData?.message || 'Round is not in Bug Introduction stage.'}</p>
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
              <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {task.language}
              </span>
              <span className="text-xs font-bold text-slate-400">• Round {round?.round_number} Stage 1</span>
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
            onClick={handleSubmitModifiedCode}
            disabled={isSubmitting || submitted}
            className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all ${
              submitted
                ? 'bg-emerald-600 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {submitted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
              </>
            ) : isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Submit Buggy Code
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Your Objective
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-sans bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                You have been given the <strong>original, correct working solution</strong> below. Intentionally introduce subtle logic, boundary, or off-by-one bugs. Maintain function names and I/O format so your peer can debug it!
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Problem Description
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>

            {task.input_format && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Input Format
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {task.input_format}
                </p>
              </div>
            )}

            {task.expected_output && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Expected Output
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
                  Sample Test Cases
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

        {/* Right Column: Code Editor & Execution Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <CodeEditor
            value={code}
            onChange={(val) => !submitted && setCode(val)}
            language={task.language}
            readOnly={submitted}
            height="420px"
            title="Introduce Bugs Here"
            onReset={handleReset}
          />

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

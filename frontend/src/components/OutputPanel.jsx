import React, { useState } from 'react';
import { Terminal, AlertTriangle, Cpu, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function OutputPanel({
  stdout = '',
  stderr = '',
  compileOutput = '',
  status = null,
  executionTimeMs = null,
  memoryKb = null,
  engine = null,
  customInput = '',
  onCustomInputChange,
  isRunning = false,
  onRun,
}) {
  const [activeTab, setActiveTab] = useState('output');

  const hasErrors = Boolean(stderr || compileOutput);

  let statusBadge = null;
  if (status) {
    if (status === 'Accepted') {
      statusBadge = (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
        </span>
      );
    } else if (status === 'Compilation Error') {
      statusBadge = (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/80 text-xs font-semibold">
          <XCircle className="w-3.5 h-3.5" /> Compilation Error
        </span>
      );
    } else if (status === 'Time Limit Exceeded') {
      statusBadge = (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/80 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded
        </span>
      );
    } else {
      statusBadge = (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/80 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" /> {status}
        </span>
      );
    }
  }

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl text-slate-200">
      {/* Header with Tabs and Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-850 border-b border-slate-755">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'output' ? 'bg-slate-750 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Output
          </button>

          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'input' ? 'bg-slate-750 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Custom Input
          </button>

          {hasErrors && (
            <button
              onClick={() => setActiveTab('errors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'errors' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-rose-400 hover:bg-rose-950/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Errors
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {statusBadge}

          {executionTimeMs !== null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
              <Cpu className="w-3.5 h-3.5 text-slate-500" /> {executionTimeMs}ms
            </span>
          )}

          {onRun && (
            <button
              onClick={onRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all shadow-emerald-900/30"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-current'}`} />
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3.5 min-h-[160px] max-h-[220px] overflow-y-auto font-mono text-xs dark-scrollbar">
        {activeTab === 'output' && (
          <div>
            {stdout ? (
              <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">{stdout}</pre>
            ) : isRunning ? (
              <p className="text-slate-500 italic">Submitting code to execution sandbox...</p>
            ) : hasErrors ? (
              <p className="text-rose-400">Execution encountered errors. Check the Errors tab.</p>
            ) : (
              <p className="text-slate-500 italic">No output yet. Click 'Run Code' to test your solution.</p>
            )}
          </div>
        )}

        {activeTab === 'input' && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-slate-400 font-sans">Custom Standard Input (stdin):</label>
            <textarea
              value={customInput}
              onChange={(e) => onCustomInputChange && onCustomInputChange(e.target.value)}
              placeholder="Enter test inputs to supply to your program's stdin..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-2 text-rose-300">
            {compileOutput && (
              <div>
                <p className="font-sans font-bold text-rose-400 mb-1">Compiler Output:</p>
                <pre className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg text-rose-200 whitespace-pre-wrap">
                  {compileOutput}
                </pre>
              </div>
            )}
            {stderr && (
              <div>
                <p className="font-sans font-bold text-rose-400 mb-1">Standard Error (stderr):</p>
                <pre className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg text-rose-200 whitespace-pre-wrap">
                  {stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check, RotateCcw, Code, ZoomIn, ZoomOut } from 'lucide-react';

const LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  c: 'c',
  java: 'java',
};

export default function CodeEditor({
  value = '',
  onChange,
  language = 'python',
  readOnly = false,
  height = '500px',
  onReset,
  title = 'Code Workspace',
}) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const monacoLang = LANGUAGE_MAP[language.toLowerCase()] || 'plaintext';

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-850 border-b border-slate-750 text-slate-300">
        <div className="flex items-center gap-2.5">
          <Code className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">{title}</span>
          <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
            {language}
          </span>
          {readOnly && (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
              Read Only
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Font scale buttons */}
          <button
            onClick={() => setFontSize((f) => Math.max(11, f - 1))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
            title="Decrease Font"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-5 text-center">{fontSize}</span>
          <button
            onClick={() => setFontSize((f) => Math.min(22, f + 1))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
            title="Increase Font"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>

          {onReset && (
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors flex items-center gap-1 text-xs"
              title="Reset Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors flex items-center gap-1 text-xs"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="w-full relative">
        <Editor
          height={height}
          language={monacoLang}
          value={value}
          onChange={(val) => onChange && onChange(val || '')}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ArrowRight, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';

export default function StudentLogin() {
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [participantCode, setParticipantCode] = useState(searchParams.get('code') || '');
  const [accessCode, setAccessCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginParticipant } = useAuth();
  const navigate = useNavigate();

  const eventIdParam = searchParams.get('event_id');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await loginParticipant({
        pin: pin.trim(),
        event_id: eventIdParam || undefined,
        participant_code: participantCode.trim(),
        access_code: accessCode.trim(),
      });
      navigate('/student/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid Participant ID or Access Code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
            <UserCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Contest Entry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Join your assigned contest using the credentials provided by your organizer
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contest PIN (If Private Contest)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="6-digit PIN (e.g. 889900)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-600 transition-colors uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Participant ID *
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value)}
                placeholder="PART001"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-600 transition-colors uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Access Code *
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-600 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Example: SWAP2026 or your issued secret code</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all mt-2"
          >
            {isSubmitting ? 'Verifying Credentials...' : 'Enter Contest Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Want to browse public competitions?{' '}
            <Link to="/contests" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Contest Discovery
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/api';
import { KeyRound, ArrowRight, CheckCircle2, AlertCircle, Lock, Trophy } from 'lucide-react';

export default function JoinWithPin() {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedContest, setVerifiedContest] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await publicApi.verifyPin(pin.trim());
      if (res.success && res.data?.contest) {
        setVerifiedContest(res.data.contest);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid contest PIN. Please check with your organizer.');
      setVerifiedContest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToStudentLogin = () => {
    if (verifiedContest) {
      navigate(`/student/login?pin=${pin.trim()}&event_id=${verifiedContest.id}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Enter Private Contest PIN</h1>
          <p className="text-xs text-slate-500 mt-1">
            Private competitions require an authorized 6-digit access PIN provided by your organizer
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
              Contest Access PIN
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                type="text"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.toUpperCase());
                  setVerifiedContest(null);
                }}
                placeholder="889900"
                className="w-full text-center tracking-[0.3em] font-mono text-2xl font-extrabold py-3 rounded-2xl border-2 border-indigo-200 focus:outline-none focus:border-indigo-600 transition-colors uppercase bg-indigo-50/20 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Verifying PIN...' : 'Verify Access PIN'}
            <KeyRound className="w-4 h-4" />
          </button>
        </form>

        {/* Verified Contest Card */}
        {verifiedContest && (
          <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> PIN Verified: Contest Found!
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{verifiedContest.name}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{verifiedContest.description}</p>
                <p className="text-[11px] text-slate-500 mt-1">Organized by {verifiedContest.organizer_name}</p>
              </div>

              <button
                onClick={handleProceedToStudentLogin}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all mt-1"
              >
                Proceed to Login with Participant ID & Code <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventApi } from '../../services/api';
import {
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Globe,
  Calendar,
  Layers,
  Settings,
  Sparkles,
  KeyRound,
  AlertCircle
} from 'lucide-react';

const ALL_LANGUAGES = ['python', 'javascript', 'cpp', 'java', 'c'];

export default function CreateContest() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    banner_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    visibility: 'public',
    allowed_languages: ['python', 'javascript'],
    max_participants: 50,
    start_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    total_rounds: 1,
    rules: '1. Participants must keep core function signatures intact.\n2. Introduce non-trivial bugs.\n3. Automated tests will evaluate fixes after swap.',
    scoring_test_cases: 60,
    scoring_organizer_review: 20,
    scoring_explanation: 20,
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdContest, setCreatedContest] = useState(null);

  const navigate = useNavigate();

  const handleLangToggle = (lang) => {
    const current = formData.allowed_languages;
    if (current.includes(lang)) {
      if (current.length === 1) return; // at least 1 language
      setFormData({ ...formData, allowed_languages: current.filter((l) => l !== lang) });
    } else {
      setFormData({ ...formData, allowed_languages: [...current, lang] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        banner_url: formData.banner_url || null,
        visibility: formData.visibility,
        allowed_languages: formData.allowed_languages,
        max_participants: parseInt(formData.max_participants, 10),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        total_rounds: parseInt(formData.total_rounds, 10),
        rules: formData.rules,
        scoring_config: {
          test_cases: parseInt(formData.scoring_test_cases, 10),
          organizer_review: parseInt(formData.scoring_organizer_review, 10),
          explanation: parseInt(formData.scoring_explanation, 10),
        },
      };

      const res = await eventApi.createEvent(payload);
      if (res.success && res.data) {
        setCreatedContest(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create contest.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Create New Competition</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Set up a multi-round peer-to-peer code swapping tournament in 4 simple steps
        </p>
      </div>

      {/* Stepper Progress */}
      {!createdContest && (
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { num: 1, title: 'Basics & Info' },
            { num: 2, title: 'Access & Languages' },
            { num: 3, title: 'Dates & Capacity' },
            { num: 4, title: 'Rules & Scoring' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              className={`p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                step === s.num
                  ? 'bg-indigo-50/80 border-indigo-300 text-indigo-700 shadow-sm'
                  : step > s.num
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider block">Step {s.num}</span>
              <span className="text-xs font-semibold truncate block mt-0.5">{s.title}</span>
            </div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success View */}
      {createdContest ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Contest Successfully Created!</h2>
            <p className="text-xs text-slate-500 mt-1">{createdContest.name} is ready for participant onboarding.</p>
          </div>

          {createdContest.pin && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white font-mono text-center space-y-2 border border-slate-800">
              <span className="text-xs text-slate-400 block uppercase tracking-wider">Private Contest PIN:</span>
              <span className="text-3xl font-extrabold text-amber-400 tracking-[0.2em]">{createdContest.pin}</span>
              <p className="text-[11px] text-slate-400 mt-1">
                Save this PIN. Private participants will use this PIN to enter this contest.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => navigate(`/organizer/contests/${createdContest.id}`)}
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              Open Contest Overview & Controls <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/organizer/dashboard"
              className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* Multi-Step Form */
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 1: General Contest Information
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contest Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Inter-College Bug Swap Showdown 2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain the format, target audience, and exciting details about this debugging battle..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={!formData.name || !formData.description}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Next: Access & Languages <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 2: Visibility & Allowed Languages
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Contest Visibility *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormData({ ...formData, visibility: 'public' })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      formData.visibility === 'public'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                      <Globe className="w-4 h-4 text-indigo-600" /> Public Contest
                    </div>
                    <p className="text-xs text-slate-500">
                      Discoverable on the public contest page. Any student can join up to capacity.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, visibility: 'private' })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      formData.visibility === 'private'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                      <Lock className="w-4 h-4 text-amber-500" /> Private Contest (PIN Required)
                    </div>
                    <p className="text-xs text-slate-500">
                      Hidden from public listings. Requires a unique 6-digit access PIN generated upon creation.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Allowed Programming Languages *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_LANGUAGES.map((lang) => {
                    const selected = formData.allowed_languages.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => handleLangToggle(lang)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold border transition-all ${
                          selected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Select all languages available for challenges in this contest.</p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Next: Schedule & Capacity <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 3: Schedule, Rounds & Capacity
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Maximum Participants *
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={500}
                    required
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Number of Rounds *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formData.total_rounds}
                    onChange={(e) => setFormData({ ...formData, total_rounds: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Next: Rules & Scoring <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Step 4: Rules & Scoring Configuration
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Contest Rules
                </label>
                <textarea
                  rows={4}
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="Contest rules displayed to participants..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Scoring Allocation (Total = 100 Marks)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-1">Hidden Tests (pts)</span>
                    <input
                      type="number"
                      value={formData.scoring_test_cases}
                      onChange={(e) => setFormData({ ...formData, scoring_test_cases: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold font-mono"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-1">Organizer Review (pts)</span>
                    <input
                      type="number"
                      value={formData.scoring_organizer_review}
                      onChange={(e) => setFormData({ ...formData, scoring_organizer_review: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold font-mono"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-1">Bug Explanation (pts)</span>
                    <input
                      type="number"
                      value={formData.scoring_explanation}
                      onChange={(e) => setFormData({ ...formData, scoring_explanation: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? 'Creating Competition...' : 'Create Competition'}
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

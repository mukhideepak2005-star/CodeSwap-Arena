import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/api';
import Loading from '../../components/Loading';
import { Trophy, Calendar, Users, Code2, ShieldAlert, CheckCircle2, ArrowRight, UserPlus, X } from 'lucide-react';

export default function ContestDetails() {
  const { id } = useParams();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [joinResult, setJoinResult] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadContest() {
      try {
        const res = await publicApi.getContest(id);
        if (res.success && res.data?.contest) {
          setContest(res.data.contest);
        }
      } catch (err) {
        console.error('Failed to load contest:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContest();
  }, [id]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError('');
    setIsJoining(true);

    try {
      const res = await publicApi.joinContest(id, {
        display_name: displayName,
        email: email || undefined,
        pin: pin || undefined,
      });

      if (res.success && res.data) {
        setJoinResult(res.data);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join contest.');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) return <Loading message="Loading contest details..." />;
  if (!contest) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-white p-8 rounded-2xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Contest Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">This contest does not exist or has been removed.</p>
        <Link to="/contests" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
          Back to Contests
        </Link>
      </div>
    );
  }

  const {
    name,
    description,
    banner_url,
    organizer_name,
    organizer_organization,
    organizer_bio,
    allowed_languages = [],
    max_participants,
    registered_count = 0,
    rules,
    start_time,
    end_time,
    status,
  } = contest;

  const isLive = status === 'live';
  const seatsRemaining = Math.max(0, max_participants - registered_count);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Banner Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 text-white shadow-xl mb-8">
        {banner_url && (
          <img
            src={banner_url}
            alt={name}
            className="w-full h-56 sm:h-72 object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isLive ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-600 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> LIVE NOW
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-600 text-white">
                  {status?.toUpperCase()}
                </span>
              )}
              <span className="text-xs font-mono text-slate-300">
                {seatsRemaining} Seats Remaining
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Hosted by <span className="font-semibold text-white">{organizer_name}</span> {organizer_organization && `(${organizer_organization})`}
            </p>
          </div>

          <button
            onClick={() => setJoinModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Join This Contest
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Description & Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3">About This Competition</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>

          {rules && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Contest Rules & Guidelines
              </h2>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-xl border border-slate-100">
                {rules}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Timeline & Specs */}
        <div className="space-y-6">
          {/* Key Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Competition Specs</h3>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Allowed Languages</span>
              <div className="flex flex-wrap gap-1.5">
                {allowed_languages.map((l) => (
                  <span
                    key={l}
                    className="text-xs font-mono uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Participant Capacity</span>
              <p className="text-sm font-semibold text-slate-800">
                {registered_count} / {max_participants} registered
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Scheduled Timeline</span>
              <p className="text-xs text-slate-700">
                Start: {new Date(start_time).toLocaleString()}
              </p>
              <p className="text-xs text-slate-700 mt-1">
                End: {new Date(end_time).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Organizer Card */}
          {organizer_bio && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">About Organizer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{organizer_bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Join Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setJoinModalOpen(false);
                setJoinResult(null);
              }}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {!joinResult ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Join {name}</h3>
                <p className="text-xs text-slate-500 mb-6">Enter your details to generate your contest credentials.</p>

                {joinError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-xs border border-rose-200">
                    {joinError}
                  </div>
                )}

                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex_Coder99"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@college.edu"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isJoining || !displayName.trim()}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all mt-2"
                  >
                    {isJoining ? 'Registering...' : 'Confirm & Generate Access Code'}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Registration Successful!</h3>
                <p className="text-xs text-slate-500">
                  Please save these credentials now. You will need them to enter the competition workspace.
                </p>

                <div className="bg-slate-900 text-white p-4 rounded-2xl font-mono text-left space-y-2 text-xs border border-slate-800">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Participant ID:</span>
                    <span className="text-indigo-400 font-bold text-sm">{joinResult.participant_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Access Code:</span>
                    <span className="text-emerald-400 font-bold text-sm">{joinResult.access_code}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigate(`/student/login?code=${joinResult.participant_code}&event_id=${id}`);
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all mt-2"
                >
                  Proceed Directly to Student Login <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

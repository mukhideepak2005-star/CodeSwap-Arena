import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Lock, Globe, ArrowRight, Code2 } from 'lucide-react';

export default function ContestCard({ contest, isOrganizer = false }) {
  const {
    id,
    name,
    description,
    banner_url,
    visibility,
    status,
    allowed_languages = [],
    max_participants,
    registered_count = 0,
    participant_count,
    organizer_name,
    start_time,
  } = contest;

  const count = registered_count || participant_count || 0;
  const capacityPercent = max_participants > 0 ? Math.min(100, Math.round((count / max_participants) * 100)) : 0;

  const isLive = status === 'live';
  const isUpcoming = status === 'upcoming';
  const isCompleted = status === 'completed';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
      {/* Banner */}
      <div className="h-36 relative overflow-hidden bg-slate-900">
        {banner_url ? (
          <img
            src={banner_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-indigo-900 via-slate-900 to-purple-900 flex items-center justify-center">
            <Code2 className="w-12 h-12 text-indigo-400/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

        {/* Status & Visibility Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {visibility === 'private' ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-amber-300 border border-amber-500/40">
              <Lock className="w-3 h-3" /> Private
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-emerald-300 border border-emerald-500/40">
              <Globe className="w-3 h-3" /> Public
            </span>
          )}

          {isLive && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-sm shadow-rose-900/50 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span> LIVE
            </span>
          )}
          {isUpcoming && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600/90 text-white">
              Upcoming
            </span>
          )}
          {isCompleted && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
            {name}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {description}
          </p>

          {/* Languages */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {allowed_languages.map((lang) => (
              <span
                key={lang}
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Stats & Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
          {/* Capacity Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" /> {count} / {max_participants} joined
              </span>
              <span className="font-semibold text-slate-700">{capacityPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  capacityPercent >= 90 ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${capacityPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-500 truncate max-w-[150px]">
              By <span className="font-medium text-slate-700">{organizer_name || 'Organizer'}</span>
            </span>

            {isOrganizer ? (
              <Link
                to={`/organizer/contests/${id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
              >
                Manage Contest <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to={`/contests/${id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
              >
                View Contest <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

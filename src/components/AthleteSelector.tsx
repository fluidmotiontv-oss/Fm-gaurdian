/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AthleteProfile } from '../types';
import { User, Award, Zap, Crosshair, ChevronRight } from 'lucide-react';

interface AthleteSelectorProps {
  athletes: AthleteProfile[];
  selectedAthleteId: string;
  onSelectAthlete: (athlete: AthleteProfile) => void;
  onSendQuickCoachingTip: (tipPrompt: string) => void;
}

export const AthleteSelector: React.FC<AthleteSelectorProps> = ({
  athletes,
  selectedAthleteId,
  onSelectAthlete,
  onSendQuickCoachingTip,
}) => {
  const currentAthlete = athletes.find((a) => a.id === selectedAthleteId) || athletes[0];

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col gap-3">
      {/* Title and Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Athlete Roster &amp; Training Focus
          </h2>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono">
          Family &amp; Community Lineup
        </span>
      </div>

      {/* Athlete Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {athletes.map((athlete) => {
          const isSelected = athlete.id === selectedAthleteId;
          return (
            <button
              key={athlete.id}
              id={`select-athlete-${athlete.id}`}
              onClick={() => onSelectAthlete(athlete)}
              className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${athlete.avatarColor}`} />
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-200' : 'text-slate-300'}`}>
                    {athlete.name}
                  </span>
                </div>
                {athlete.age > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">{athlete.age}y</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {athlete.relation}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Athlete Executive Card */}
      {currentAthlete && (
        <div className="mt-1 bg-slate-950/70 rounded-xl border border-slate-800/90 p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-sm">{currentAthlete.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-mono text-[11px]">{currentAthlete.boardType}</span>
            </div>
            <p className="text-slate-400 text-xs flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Target: <strong className="text-slate-300 font-normal">{currentAthlete.currentFocus}</strong></span>
            </p>
          </div>

          {/* Quick Real-Time Drill Callouts */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Direct Drill:
            </span>
            {currentAthlete.recentTips.slice(0, 2).map((tip, idx) => (
              <button
                key={idx}
                onClick={() =>
                  onSendQuickCoachingTip(
                    `Executive Coach cue for ${currentAthlete.name}: ${tip}. Analyze active video and instruct with voice feedback now!`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-600/60 text-[11px] text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Send instruction to Live Coach"
              >
                <span className="line-clamp-1 max-w-[140px] text-left">{tip}</span>
                <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

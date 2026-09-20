/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldAlert,
  Radio,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  Activity,
  Waves
} from 'lucide-react';
import { OperatingMode } from '../types';

interface GuardianHeaderProps {
  mode: OperatingMode;
  onModeChange: (mode: OperatingMode) => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  modelName: string;
  onOpenSOS: () => void;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
  unreadAlertCount: number;
}

export const GuardianHeader: React.FC<GuardianHeaderProps> = ({
  mode,
  onModeChange,
  connectionStatus,
  modelName,
  onOpenSOS,
  audioMuted,
  onToggleAudioMute,
  unreadAlertCount,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo and Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Waves className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold tracking-tight text-lg text-slate-100 flex items-center gap-1.5">
                  FluidmotionTV
                  <span className="text-cyan-400 font-medium text-sm px-2 py-0.5 bg-cyan-950/70 border border-cyan-800/60 rounded-md">
                    GuardianCoach
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>Model: <strong className="text-cyan-300 font-semibold">{modelName}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="text-teal-400">Bidirectional Native Audio</span>
              </p>
            </div>
          </div>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-mono capitalize">
              {connectionStatus}
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs">
          <button
            id="mode-hybrid-btn"
            onClick={() => onModeChange('hybrid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              mode === 'hybrid'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Dual GuardianCoach
          </button>
          <button
            id="mode-coach-btn"
            onClick={() => onModeChange('coach')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              mode === 'coach'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Surf Executive Coach
          </button>
          <button
            id="mode-guardian-btn"
            onClick={() => onModeChange('guardian')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              mode === 'guardian'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Coastal Safety Guardian
          </button>
        </div>

        {/* Right Actions: Voice output toggle & Emergency SOS */}
        <div className="flex items-center gap-2">
          <button
            id="mute-audio-btn"
            onClick={onToggleAudioMute}
            title={audioMuted ? 'Unmute Coach Voice' : 'Mute Coach Voice'}
            className={`p-2 rounded-lg border transition-colors ${
              audioMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 hover:bg-cyan-900/40'
            }`}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            id="emergency-sos-header-btn"
            onClick={onOpenSOS}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>SOS DISPATCH</span>
            {unreadAlertCount > 0 && (
              <span className="ml-1 bg-white text-rose-700 rounded-full px-1.5 py-0.2 text-[10px] font-black">
                {unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

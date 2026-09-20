/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Mic, Volume2, Radio } from 'lucide-react';

interface AudioWaveformVisualizerProps {
  isMicActive: boolean;
  inputLevel: number; // 0 to 1
  outputLevel: number; // 0 to 1
  isCoachSpeaking: boolean;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  isMicActive,
  inputLevel,
  outputLevel,
  isCoachSpeaking,
}) => {
  // Generate visual bars for the audio spectrum
  const [bars, setBars] = useState<number[]>(new Array(16).fill(0.1));

  useEffect(() => {
    const activeLevel = isCoachSpeaking ? outputLevel : isMicActive ? inputLevel : 0.05;
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const base = Math.sin(Date.now() / 150 + i) * 0.3 + 0.5;
          const variance = Math.random() * 0.4;
          return Math.max(0.1, Math.min(1, (base + variance) * activeLevel + 0.08));
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [inputLevel, outputLevel, isCoachSpeaking, isMicActive]);

  return (
    <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      {/* State & Modality Indicator */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800">
          {isCoachSpeaking ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-semibold uppercase tracking-wider text-[11px]">
                Coach Speaking (24kHz Output)
              </span>
            </>
          ) : isMicActive ? (
            <>
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              <span className="text-emerald-300 font-semibold uppercase tracking-wider text-[11px]">
                Surfer Mic Streaming (16kHz Input)
              </span>
            </>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">
                Bidirectional Stream Ready
              </span>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Spectral Bar Visualizer */}
      <div className="flex items-center gap-1 h-7 px-3 bg-slate-900/80 rounded-lg border border-slate-800/80 w-full sm:w-64 justify-center">
        {bars.map((height, idx) => (
          <div
            key={idx}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isCoachSpeaking
                ? 'bg-gradient-to-t from-cyan-600 to-teal-300 shadow-sm shadow-cyan-500/50'
                : isMicActive
                ? 'bg-gradient-to-t from-emerald-600 to-lime-300 shadow-sm shadow-emerald-500/50'
                : 'bg-slate-700/60'
            }`}
            style={{
              height: `${Math.round(height * 22) + 4}px`,
            }}
          />
        ))}
      </div>

      {/* Real-time Status Details */}
      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
        <span>In: <strong className={inputLevel > 0.1 ? 'text-emerald-400' : 'text-slate-500'}>{(inputLevel * 100).toFixed(0)}%</strong></span>
        <span>Out: <strong className={outputLevel > 0.1 ? 'text-cyan-400' : 'text-slate-500'}>{(outputLevel * 100).toFixed(0)}%</strong></span>
        <span className="text-teal-400">Stateful WS</span>
      </div>
    </div>
  );
};

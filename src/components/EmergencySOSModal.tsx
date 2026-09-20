/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Radio, Volume2, VolumeX, PhoneCall, Check } from 'lucide-react';
import { HazardAlert, CoastalTelemetry } from '../types';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeHazards: HazardAlert[];
  telemetry: CoastalTelemetry;
  onBroadcastBeacon: (message: string) => void;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({
  isOpen,
  onClose,
  activeHazards,
  telemetry,
  onBroadcastBeacon,
}) => {
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    return () => {
      if (oscillator) {
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch (e) {}
      }
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [oscillator, audioCtx]);

  if (!isOpen) return null;

  const toggleSiren = () => {
    if (sirenPlaying) {
      if (oscillator) {
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch (e) {}
      }
      setOscillator(null);
      setSirenPlaying(false);
    } else {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtxClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);

        // Modulate siren pitch up and down
        const now = ctx.currentTime;
        for (let i = 0; i < 30; i++) {
          osc.frequency.linearRampToValueAtTime(850, now + i * 1.0 + 0.5);
          osc.frequency.linearRampToValueAtTime(500, now + i * 1.0 + 1.0);
        }

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        setAudioCtx(ctx);
        setOscillator(osc);
        setGainNode(gain);
        setSirenPlaying(true);
      } catch (err) {
        console.warn('Siren audio error:', err);
      }
    }
  };

  const handleDispatch = () => {
    setDispatched(true);
    onBroadcastBeacon(
      `[EMERGENCY SOS BROADCAST] Coastal Lifeguard Dispatch triggered. Coordinates: Zone Alpha / Peak Channel. Swell: ${telemetry.swellHeightM}m, Rip Hazard Active. Dispatched to local safety network.`
    );
    setTimeout(() => {
      setDispatched(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-rose-600 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-900/50 pb-3">
          <div className="flex items-center gap-2 text-rose-500">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <div>
              <h3 className="font-black text-base tracking-wider uppercase">
                Coastal Lifeguard Emergency SOS
              </h3>
              <p className="text-[10px] text-rose-300 font-mono">
                Rapid Distress Beacon &amp; Coastal Alert Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (sirenPlaying) toggleSiren();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout */}
        <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3.5 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-200">Surveillance Grid: Station 4B</span>
            <span className="font-mono text-rose-400 text-[11px]">
              Tide: {telemetry.tideStage} | Swell: {telemetry.swellHeightM}m
            </span>
          </div>
          <p className="text-rose-200/90 leading-relaxed">
            {activeHazards.length > 0
              ? `Active Hazards (${activeHazards.length}): ${activeHazards
                  .map((h) => `${h.title}`)
                  .join(', ')}.`
              : 'Swimmer in distress protocol standby. Ready to transmit coordinates to local surf lifesaving patrols.'}
          </p>
        </div>

        {/* Siren Sound Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {sirenPlaying ? (
              <Volume2 className="w-5 h-5 text-rose-400 animate-bounce" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <p className="font-semibold text-slate-200">Acoustic Coastal Siren</p>
              <p className="text-[11px] text-slate-400">
                Audible 600Hz-850Hz modulated klaxon distress tone
              </p>
            </div>
          </div>
          <button
            onClick={toggleSiren}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
              sirenPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {sirenPlaying ? 'Stop Siren' : 'Test Siren'}
          </button>
        </div>

        {/* Dispatch Action */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleDispatch}
            disabled={dispatched}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-950/80 cursor-pointer disabled:opacity-50"
          >
            {dispatched ? (
              <>
                <Check className="w-5 h-5 text-emerald-300" />
                <span>BEACON TRANSMITTED TO PATROL</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-5 h-5" />
                <span>BROADCAST EMERGENCY DISPATCH BEACON</span>
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-500">
            Transmits real-time distress vector and camera snapshot to regional coastal lifesaving authorities.
          </p>
        </div>
      </div>
    </div>
  );
};

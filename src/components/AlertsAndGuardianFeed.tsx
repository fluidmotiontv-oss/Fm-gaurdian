/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  LifeBuoy,
  Waves,
  CheckCircle,
  Radio,
  Bell,
  BellOff,
  Flame,
  UserX
} from 'lucide-react';
import { HazardAlert } from '../types';

interface AlertsAndGuardianFeedProps {
  alerts: HazardAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onSimulateHazard: (type: 'distress' | 'rip' | 'collision') => void;
  onOpenSOS: () => void;
}

export const AlertsAndGuardianFeed: React.FC<AlertsAndGuardianFeedProps> = ({
  alerts,
  onAcknowledgeAlert,
  onSimulateHazard,
  onOpenSOS,
}) => {
  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  const getCategoryIcon = (category: HazardAlert['category']) => {
    switch (category) {
      case 'distress':
        return <UserX className="w-4 h-4 text-rose-400" />;
      case 'rip_current':
        return <Waves className="w-4 h-4 text-amber-400" />;
      case 'collision':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'impact_zone':
        return <Flame className="w-4 h-4 text-red-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getLevelBadgeClass = (level: HazardAlert['level']) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    }
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col gap-3">
      {/* Header and Counters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Coastal Safety Guardian Feed
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950 font-mono text-slate-300 border border-slate-800">
            {unacknowledged.length} Active Hazard{unacknowledged.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Quick Hazard Simulation Buttons (for testing live alerts & voice prompts) */}
      <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1">
          <Radio className="w-3 h-3 text-cyan-400" />
          Test Alert:
        </span>
        <button
          onClick={() => onSimulateHazard('distress')}
          className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-[11px] font-semibold transition-colors cursor-pointer"
        >
          🚨 Swimmer In Distress
        </button>
        <button
          onClick={() => onSimulateHazard('rip')}
          className="px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold transition-colors cursor-pointer"
        >
          🌊 Rip Current Surge
        </button>
        <button
          onClick={() => onSimulateHazard('collision')}
          className="px-2.5 py-1 rounded-lg bg-orange-950/40 hover:bg-orange-900/60 text-orange-300 border border-orange-800/50 text-[11px] font-semibold transition-colors cursor-pointer"
        >
          ⚠️ Lineup Collision
        </button>
      </div>

      {/* Alert Feed Cards List */}
      <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <LifeBuoy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No hazardous conditions or distress detected. Camera telemetry clear.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                alert.acknowledged
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : alert.level === 'critical'
                  ? 'bg-rose-950/30 border-rose-600/70 shadow-lg shadow-rose-950/40'
                  : 'bg-slate-950/80 border-slate-850'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(alert.category)}
                  <span className="text-xs font-bold text-slate-200">
                    {alert.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold uppercase ${getLevelBadgeClass(
                      alert.level
                    )}`}
                  >
                    {alert.level}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {alert.timestamp}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {alert.description}
              </p>

              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-900">
                <span className="text-[10px] text-slate-400 font-mono">
                  {alert.coordinates
                    ? `Grid: ${(alert.coordinates.x * 100).toFixed(0)}%E / ${(alert.coordinates.y * 100).toFixed(0)}%N`
                    : 'Surveillance Zone Alpha'}
                </span>

                <div className="flex items-center gap-2">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Acknowledge
                    </button>
                  )}
                  {alert.level === 'critical' && (
                    <button
                      onClick={onOpenSOS}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white transition-colors cursor-pointer"
                    >
                      Dispatch SOS
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

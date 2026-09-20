/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  Zap,
  RotateCcw
} from 'lucide-react';
import { CoachingTranscriptItem, OperatingMode } from '../types';
import { speakCoachVoice } from '../services/audioUtils';

interface CoachingChatConsoleProps {
  transcript: CoachingTranscriptItem[];
  onSendMessage: (text: string) => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  isCoachSpeaking: boolean;
  onInterruptCoach: () => void;
  mode: OperatingMode;
  onClearTranscript: () => void;
}

export const CoachingChatConsole: React.FC<CoachingChatConsoleProps> = ({
  transcript,
  onSendMessage,
  isMicActive,
  onToggleMic,
  isCoachSpeaking,
  onInterruptCoach,
  mode,
  onClearTranscript,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const quickPrompts = [
    'Coach Kai: Analyze vertical rail snap & compression',
    'Safety Scan: Verify swimmer safety near sandbar rip',
    'Coach Maya: Advise cross-step timing on high line',
    'Coach Leo: Check paddle speed and pop-up balance'
  ];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col h-[520px] shadow-xl overflow-hidden">
      {/* Console Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Bidirectional Coaching &amp; Guardian Console
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Live Native Audio Voiceover &amp; Text Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCoachSpeaking && (
            <button
              onClick={onInterruptCoach}
              className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-bold border border-rose-800 flex items-center gap-1 transition-colors cursor-pointer"
              title="Interrupt Coach Audio"
            >
              <Square className="w-3 h-3 fill-rose-300" />
              <span>Interrupt</span>
            </button>
          )}

          <button
            onClick={onClearTranscript}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title="Clear Chat Log"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Carousel Bar */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-500 font-mono text-[10px] shrink-0 uppercase flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Quick Ask:
        </span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(prompt)}
            className="shrink-0 px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-600/60 text-slate-300 hover:text-cyan-200 transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message History Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
        {transcript.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 text-cyan-500/50 mb-2" />
            <p className="font-medium text-slate-400">Stream connected &amp; ready</p>
            <p className="text-[11px] max-w-xs mt-1">
              Speak via microphone, play a coastal video feed, or type instructions below to receive instant executive coaching and coastal safety alerts.
            </p>
          </div>
        ) : (
          transcript.map((item) => {
            const isCoach = item.sender === 'coach';
            const isGuardian = item.sender === 'guardian';
            const isUser = item.sender === 'athlete';

            return (
              <div
                key={item.id}
                className={`flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {isCoach && <span className="text-[10px] font-bold text-cyan-400">EXECUTIVE COACH</span>}
                  {isGuardian && <span className="text-[10px] font-bold text-rose-400">SAFETY GUARDIAN</span>}
                  {isUser && <span className="text-[10px] font-bold text-emerald-400">SURF SQUAD</span>}
                  <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    item.isAlert
                      ? 'bg-rose-950/40 border border-rose-600/80 text-rose-200 shadow-md shadow-rose-950/40'
                      : isCoach
                      ? 'bg-slate-800/90 border border-slate-700 text-slate-100'
                      : isGuardian
                      ? 'bg-amber-950/30 border border-amber-700/60 text-amber-200'
                      : 'bg-emerald-950/40 border border-emerald-700/60 text-emerald-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{item.text}</p>

                  {(isCoach || isGuardian) && (
                    <div className="mt-2 pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono">Voiceover Streamed</span>
                      <button
                        onClick={() => speakCoachVoice(item.text)}
                        className="p-1 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Replay Voiceover"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Replay</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Controls Bottom Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            isMicActive
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-900/40'
              : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
          title={isMicActive ? 'Mute Microphone Stream' : 'Enable 16kHz Surfer Mic Stream'}
        >
          {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask coach technique cue, or report coastal hazard..."
          className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md shadow-cyan-950/50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

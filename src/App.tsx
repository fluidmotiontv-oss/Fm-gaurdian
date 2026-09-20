/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GuardianHeader
} from './components/GuardianHeader';
import {
  VideoPlayerStage
} from './components/VideoPlayerStage';
import {
  AudioWaveformVisualizer
} from './components/AudioWaveformVisualizer';
import {
  AthleteSelector
} from './components/AthleteSelector';
import {
  CoachingChatConsole
} from './components/CoachingChatConsole';
import {
  AlertsAndGuardianFeed
} from './components/AlertsAndGuardianFeed';
import {
  PreRecordedSessionModal
} from './components/PreRecordedSessionModal';
import {
  EmergencySOSModal
} from './components/EmergencySOSModal';
import {
  OperatingMode,
  AthleteProfile,
  HazardAlert,
  CoachingTranscriptItem,
  CoastalTelemetry,
  VideoSourceOption,
} from './types';
import {
  ATHLETE_PROFILES,
  INITIAL_TELEMETRY,
  INITIAL_HAZARDS,
  VIDEO_SOURCES,
} from './data/mockFeeds';
import {
  LiveSocketClient
} from './services/liveSocket';
import {
  LiveAudioPlayer,
  floatTo16BitPCM,
  arrayBufferToBase64,
  speakCoachVoice,
} from './services/audioUtils';
import { Activity, ShieldAlert, Waves, Sparkles } from 'lucide-react';

export default function App() {
  // System State
  const [mode, setMode] = useState<OperatingMode>('hybrid');
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash-native-audio');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);

  // Athletes & Feeds
  const [athletes] = useState<AthleteProfile[]>(ATHLETE_PROFILES);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile>(ATHLETE_PROFILES[0]);
  const [videoSources, setVideoSources] = useState<VideoSourceOption[]>(VIDEO_SOURCES);
  const [currentSource, setCurrentSource] = useState<VideoSourceOption>(VIDEO_SOURCES[0]);

  // Coastal Safety & Telemetry
  const [hazards, setHazards] = useState<HazardAlert[]>(INITIAL_HAZARDS);
  const [telemetry, setTelemetry] = useState<CoastalTelemetry>(INITIAL_TELEMETRY);

  // Coaching Transcript
  const [transcript, setTranscript] = useState<CoachingTranscriptItem[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'coach',
      text: "FluidmotionTV GuardianCoach active. Watching over Nephew Kai, Leo, Maya, and the open lineup. Live Native Audio stream connected. Let's analyze wave tempo and coastal safety.",
      modality: 'audio',
    },
  ]);

  // Audio Streaming State
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [inputAudioLevel, setInputAudioLevel] = useState<number>(0);
  const [outputAudioLevel, setOutputAudioLevel] = useState<number>(0);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState<boolean>(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState<boolean>(false);
  const [isAnalyzingSnapshot, setIsAnalyzingSnapshot] = useState<boolean>(false);

  // Services Refs
  const socketClientRef = useRef<LiveSocketClient | null>(null);
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize Audio Player
  useEffect(() => {
    const player = new LiveAudioPlayer((level) => {
      setOutputAudioLevel(level);
      setIsCoachSpeaking(level > 0.05);
    });
    audioPlayerRef.current = player;

    return () => {
      player.close();
    };
  }, []);

  // Initialize WebSocket connection to /live
  useEffect(() => {
    const socket = new LiveSocketClient({
      onAudioChunk: (base64Audio) => {
        if (!audioMuted && audioPlayerRef.current) {
          audioPlayerRef.current.enqueueBase64Chunk(base64Audio);
        }
      },
      onTextChunk: (text) => {
        setTranscript((prev) => {
          // Check if previous message was from coach and recent, append or add
          const last = prev[prev.length - 1];
          if (last && last.sender === 'coach' && Date.now() - new Date(last.timestamp).getTime() < 3000) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + ' ' + text },
            ];
          }
          return [
            ...prev,
            {
              id: `coach-${Date.now()}-${Math.random()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              sender: text.includes('ALERT') || text.includes('HAZARD') ? 'guardian' : 'coach',
              text,
              modality: 'audio',
              isAlert: text.includes('ALERT') || text.includes('HAZARD') || text.includes('DISTRESS'),
            },
          ];
        });

        // If muted or audio player not playing, optionally reinforce
        if (text.includes('ALERT') || text.includes('DISTRESS')) {
          setHazards((prev) => [
            {
              id: `hz-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              level: text.includes('CRITICAL') ? 'critical' : 'high',
              category: text.includes('rip') ? 'rip_current' : 'distress',
              title: 'Live Audio Hazard Detected',
              description: text,
              coordinates: { x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.45 + (Math.random() - 0.5) * 0.2 },
              acknowledged: false,
            },
            ...prev,
          ]);
        }
      },
      onInterrupted: () => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.interrupt();
        }
        setIsCoachSpeaking(false);
      },
      onTurnComplete: () => {
        // completed turn
      },
      onStatusChange: (status, details) => {
        setConnectionStatus(status);
        if (details) {
          setModelName(details);
        }
      },
      onError: (err) => {
        console.warn('Socket error reported:', err);
      },
    });

    socket.connect();
    socketClientRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [audioMuted]);

  // Handle Microphone toggling and streaming (16kHz PCM)
  const toggleMicrophone = async () => {
    if (isMicActive) {
      // Stop mic
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (micAudioCtxRef.current) {
        micAudioCtxRef.current.close();
        micAudioCtxRef.current = null;
      }
      setIsMicActive(false);
      setInputAudioLevel(0);
    } else {
      // Start mic at 16kHz
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = stream;

        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtxClass({ sampleRate: 16000 });
        micAudioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        micProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(ctx.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate RMS level for visualizer
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setInputAudioLevel(Math.min(1, rms * 5));

          // Convert Float32 to 16-bit PCM Linear Base64
          const pcmBuffer = floatTo16BitPCM(inputData);
          const base64Pcm = arrayBufferToBase64(pcmBuffer);

          if (socketClientRef.current) {
            socketClientRef.current.sendAudioChunk(base64Pcm);
          }
        };

        setIsMicActive(true);
      } catch (err: any) {
        console.warn('Microphone access failed:', err);
        alert(
          err.name === 'NotAllowedError'
            ? 'Microphone permission was denied. Please allow microphone access in browser settings.'
            : `Could not access microphone: ${err.message || 'Check audio device'}`
        );
      }
    }
  };

  // Send video frame via WebSocket
  const handleSendFrame = useCallback((base64Jpeg: string) => {
    if (socketClientRef.current) {
      socketClientRef.current.sendVideoFrame(base64Jpeg);
    }
  }, []);

  // Send text message prompt
  const handleSendMessage = (text: string) => {
    // Add to user transcript
    const userMsg: CoachingTranscriptItem = {
      id: `user-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sender: 'athlete',
      text,
      modality: 'text',
      athleteId: selectedAthlete.id,
    };
    setTranscript((prev) => [...prev, userMsg]);

    // Send to WebSocket
    if (socketClientRef.current) {
      socketClientRef.current.sendTextMessage(
        `[Focus: ${selectedAthlete.name} (${selectedAthlete.currentFocus})] [Mode: ${mode}] ${text}`
      );
    }
  };

  // Immediate frame analysis fallback
  const handleAnalyzeFrameManual = async (base64Jpeg: string) => {
    setIsAnalyzingSnapshot(true);
    try {
      const res = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Jpeg,
          athleteName: selectedAthlete.name,
          mode,
          prompt: `Analyze this coastal frame for ${selectedAthlete.name}. Focus on posture, wave selection, rail angle, and check immediate line-of-sight for swimmer distress or rip current hazards.`,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const coachItem: CoachingTranscriptItem = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        sender: 'coach',
        text: `[FRAME AUDIT - ${selectedAthlete.name}]: ${data.analysis}`,
        modality: 'video_event',
      };
      setTranscript((prev) => [...prev, coachItem]);

      // Speak aloud if not muted
      if (!audioMuted) {
        speakCoachVoice(data.analysis.slice(0, 180));
      }
    } catch (err: any) {
      console.warn('Frame analysis error:', err);
      const errMsg: CoachingTranscriptItem = {
        id: `err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: 'system',
        text: `Frame audit notice: ${err.message || 'API call failed. Ensure GEMINI_API_KEY is configured.'}`,
        modality: 'text',
      };
      setTranscript((prev) => [...prev, errMsg]);
    } finally {
      setIsAnalyzingSnapshot(false);
    }
  };

  // Simulate Hazard for safety drills
  const handleSimulateHazard = (type: 'distress' | 'rip' | 'collision') => {
    let newHazard: HazardAlert;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (type === 'distress') {
      newHazard = {
        id: `hz-distress-${Date.now()}`,
        timestamp: timeStr,
        level: 'critical',
        category: 'distress',
        title: 'Bather Distress Alert - Sandbar Trench',
        description: 'Swimmer exhibiting vertical stroke hesitation and submerged head bobbing 60m offshore from tower 3. Urgent surveillance dispatched.',
        coordinates: { x: 0.58, y: 0.48 },
        acknowledged: false,
      };
      // High alert coaching notification
      setTranscript((prev) => [
        ...prev,
        {
          id: `alert-${Date.now()}`,
          timestamp: timeStr,
          sender: 'guardian',
          text: `[GUARDIAN CRITICAL ALERT]: Swimmer in distress detected at Grid 58%E / 48%N! Cease surfing drills in sector 2 and initiate rescue standby!`,
          modality: 'audio',
          isAlert: true,
        },
      ]);
      if (!audioMuted) {
        speakCoachVoice('Guardian Alert: Swimmer distress detected at grid coordinate. All athletes clear impact zone.');
      }
    } else if (type === 'rip') {
      newHazard = {
        id: `hz-rip-${Date.now()}`,
        timestamp: timeStr,
        level: 'high',
        category: 'rip_current',
        title: 'Rip Current Velocity Surge (1.6 m/s)',
        description: 'Rapid feeder current moving seaward along northern reef edge. Advise Leo and junior surfers to paddle parallel to shore.',
        coordinates: { x: 0.72, y: 0.35 },
        acknowledged: false,
      };
    } else {
      newHazard = {
        id: `hz-col-${Date.now()}`,
        timestamp: timeStr,
        level: 'medium',
        category: 'collision',
        title: 'Lineup Congestion & Drop-in Hazard',
        description: 'Multiple riders converging inside peak. Kai and inside swimmer on collision course without clear priority signaling.',
        coordinates: { x: 0.38, y: 0.42 },
        acknowledged: false,
      };
    }

    setHazards((prev) => [newHazard, ...prev]);
    setTelemetry((prev) => ({
      ...prev,
      distressRiskScore: Math.min(100, prev.distressRiskScore + (type === 'distress' ? 35 : 15)),
    }));
  };

  const handleAcknowledgeAlert = (id: string) => {
    setHazards((prev) =>
      prev.map((h) => (h.id === id ? { ...h, acknowledged: true } : h))
    );
  };

  const handleUploadCustomSession = (newSource: VideoSourceOption) => {
    setVideoSources((prev) => [newSource, ...prev]);
    setCurrentSource(newSource);
    setTranscript((prev) => [
      ...prev,
      {
        id: `source-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: 'system',
        text: `Ingested pre-recorded session file: "${newSource.label}". Feed frames streaming to Gemini Live API.`,
        modality: 'video_event',
      },
    ]);
  };

  const handleInterruptCoach = () => {
    if (socketClientRef.current) {
      socketClientRef.current.sendTextMessage('Interrupt');
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.interrupt();
    }
    window.speechSynthesis?.cancel();
    setIsCoachSpeaking(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <GuardianHeader
        mode={mode}
        onModeChange={setMode}
        connectionStatus={connectionStatus}
        modelName={modelName}
        onOpenSOS={() => setIsSOSModalOpen(true)}
        audioMuted={audioMuted}
        onToggleAudioMute={() => setAudioMuted(!audioMuted)}
        unreadAlertCount={hazards.filter((h) => !h.acknowledged).length}
      />

      {/* Main Responsive Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        {/* Real-time Bidirectional Audio Spectrum Bar */}
        <AudioWaveformVisualizer
          isMicActive={isMicActive}
          inputLevel={inputAudioLevel}
          outputLevel={outputAudioLevel}
          isCoachSpeaking={isCoachSpeaking}
        />

        {/* Top Section: Video Stage & Athlete Profile Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Main Coastal & Video Stage (7 cols on large screens) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <VideoPlayerStage
              currentSource={currentSource}
              availableSources={videoSources}
              onSelectSource={setCurrentSource}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onSendFrame={handleSendFrame}
              onAnalyzeFrameManual={handleAnalyzeFrameManual}
              activeHazards={hazards.filter((h) => !h.acknowledged)}
              telemetry={telemetry}
              selectedAthlete={selectedAthlete}
              isStreamingActive={connectionStatus === 'connected'}
              isAnalyzingSnapshot={isAnalyzingSnapshot}
            />

            {/* Athlete Roster & Family Mentorship Selector */}
            <AthleteSelector
              athletes={athletes}
              selectedAthleteId={selectedAthlete.id}
              onSelectAthlete={setSelectedAthlete}
              onSendQuickCoachingTip={handleSendMessage}
            />
          </div>

          {/* Right Section: Bidirectional Coaching Chat Console & Guardian Feed (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Real-time Coaching Chat & Audio Console */}
            <CoachingChatConsole
              transcript={transcript}
              onSendMessage={handleSendMessage}
              isMicActive={isMicActive}
              onToggleMic={toggleMicrophone}
              isCoachSpeaking={isCoachSpeaking}
              onInterruptCoach={handleInterruptCoach}
              mode={mode}
              onClearTranscript={() => setTranscript([])}
            />

            {/* Coastal Safety Guardian Alerts Feed */}
            <AlertsAndGuardianFeed
              alerts={hazards}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onSimulateHazard={handleSimulateHazard}
              onOpenSOS={() => setIsSOSModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <PreRecordedSessionModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSession={handleUploadCustomSession}
      />

      <EmergencySOSModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        activeHazards={hazards.filter((h) => !h.acknowledged)}
        telemetry={telemetry}
        onBroadcastBeacon={(msg) => {
          handleSendMessage(msg);
          setIsSOSModalOpen(false);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          <span>FluidmotionTV-GuardianCoach • Coastal Safety &amp; Surf Performance</span>
        </div>
        <div className="flex items-center gap-3 mt-1 sm:mt-0 text-slate-400">
          <span>Model: <strong className="text-cyan-400 font-semibold">{modelName}</strong></span>
          <span>•</span>
          <span>WebSockets Bidirectional Stream</span>
        </div>
      </footer>
    </div>
  );
}

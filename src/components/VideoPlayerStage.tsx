/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  Play,
  Pause,
  Maximize,
  Scan,
  RefreshCw,
  Eye,
  AlertTriangle,
  Compass,
  Layers,
  Upload,
  Radio,
  Video as VideoIcon,
  Sparkles
} from 'lucide-react';
import { VideoSourceOption, HazardAlert, CoastalTelemetry, AthleteProfile } from '../types';

interface VideoPlayerStageProps {
  currentSource: VideoSourceOption;
  availableSources: VideoSourceOption[];
  onSelectSource: (source: VideoSourceOption) => void;
  onOpenUploadModal: () => void;
  onSendFrame: (base64Jpeg: string) => void;
  onAnalyzeFrameManual: (base64Jpeg: string) => void;
  activeHazards: HazardAlert[];
  telemetry: CoastalTelemetry;
  selectedAthlete: AthleteProfile;
  isStreamingActive: boolean;
  isAnalyzingSnapshot: boolean;
}

export const VideoPlayerStage: React.FC<VideoPlayerStageProps> = ({
  currentSource,
  availableSources,
  onSelectSource,
  onOpenUploadModal,
  onSendFrame,
  onAnalyzeFrameManual,
  activeHazards,
  telemetry,
  selectedAthlete,
  isStreamingActive,
  isAnalyzingSnapshot,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [hudLayerEnabled, setHudLayerEnabled] = useState<boolean>(true);
  const [streamFps, setStreamFps] = useState<number>(0.5); // 1 frame every 2s to conserve bandwidth while keeping Live API fresh
  const [lastCapturedTime, setLastCapturedTime] = useState<string>('');

  // Handle Webcam Start/Stop
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupWebcam() {
      if (currentSource.category === 'live') {
        try {
          setWebcamError(null);
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false, // mic is handled by audio streamer
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setWebcamActive(true);
            setIsPlaying(true);
          }
        } catch (err: any) {
          console.warn('Webcam acquisition warning:', err);
          setWebcamError(
            err.name === 'NotAllowedError'
              ? 'Camera access denied by browser permissions. Switch to a coastal archive sample below or allow camera access.'
              : `Camera error: ${err.message || 'Cannot access device camera'}`
          );
          setWebcamActive(false);
        }
      } else {
        // Cleaning up webcam if switched to sample or upload
        if (videoRef.current && videoRef.current.srcObject) {
          const s = videoRef.current.srcObject as MediaStream;
          s.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }
        setWebcamActive(false);
        setWebcamError(null);
      }
    }

    setupWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [currentSource]);

  // Capture frame from video element
  const captureCurrentFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    try {
      ctx.drawImage(video, 0, 0, width, height);
      // Export as JPEG with 0.8 quality
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.warn('Canvas frame capture failed (cross-origin or video not ready):', e);
      return null;
    }
  }, []);

  // Periodic frame transmission when live streaming is enabled
  useEffect(() => {
    if (!isStreamingActive) return;

    const intervalMs = Math.round(1000 / streamFps);
    const interval = setInterval(() => {
      const frameData = captureCurrentFrame();
      if (frameData) {
        onSendFrame(frameData);
        setLastCapturedTime(new Date().toLocaleTimeString());
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isStreamingActive, streamFps, captureCurrentFrame, onSendFrame]);

  // Manual snapshot audit
  const handleManualAudit = () => {
    const frame = captureCurrentFrame();
    if (frame) {
      onAnalyzeFrameManual(frame);
    }
  };

  // Render animated HUD overlay
  useEffect(() => {
    const hudCanvas = hudCanvasRef.current;
    if (!hudCanvas) return;
    const ctx = hudCanvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderHUD = () => {
      const w = hudCanvas.width;
      const h = hudCanvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!hudLayerEnabled) return;

      const time = Date.now() / 1000;

      // 1. Swell & Wind HUD Top-Right
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(w - 180, 14, 166, 60, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText(`SWELL: ${telemetry.swellHeightM}m @ ${telemetry.swellPeriodSec}s`, w - 170, 30);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`WIND: ${telemetry.windKts}kt ${telemetry.windDirection}`, w - 170, 46);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText(`TIDE: ${telemetry.tideStage}`, w - 170, 62);

      // 2. Active Athlete Target Reticle (Kai / Leo / Maya)
      const targetX = w * 0.45 + Math.sin(time * 0.7) * 25;
      const targetY = h * 0.52 + Math.cos(time * 0.5) * 15;
      const boxW = 84;
      const boxH = 50;

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(targetX - boxW / 2, targetY - boxH / 2, boxW, boxH);

      // Target Corner Brackets
      const len = 8;
      ctx.strokeStyle = '#22d3ee';
      ctx.beginPath();
      // Top left
      ctx.moveTo(targetX - boxW / 2 - 4, targetY - boxH / 2 + len);
      ctx.lineTo(targetX - boxW / 2 - 4, targetY - boxH / 2 - 4);
      ctx.lineTo(targetX - boxW / 2 + len, targetY - boxH / 2 - 4);
      // Bottom right
      ctx.moveTo(targetX + boxW / 2 + 4, targetY + boxH / 2 - len);
      ctx.lineTo(targetX + boxW / 2 + 4, targetY + boxH / 2 + 4);
      ctx.lineTo(targetX + boxW / 2 - len, targetY + boxH / 2 + 4);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.fillRect(targetX - boxW / 2, targetY - boxH / 2 - 14, boxW, 14);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(selectedAthlete.name.toUpperCase(), targetX - boxW / 2 + 4, targetY - boxH / 2 - 4);

      // 3. Hazard Markers
      activeHazards.forEach((hazard, i) => {
        if (!hazard.coordinates) return;
        const hx = hazard.coordinates.x * w;
        const hy = hazard.coordinates.y * h;
        const pulse = (Math.sin(time * 3 + i) + 1) / 2;

        ctx.strokeStyle = hazard.level === 'critical' ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, hy, 16 + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hazard.level === 'critical' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.85)';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(hazard.category.toUpperCase(), hx - 20, hy - 22);
      });

      // 4. Rip current trajectory vector (subtle flowing lines)
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.35)';
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      ctx.moveTo(w * 0.7, h * 0.7);
      ctx.bezierCurveTo(w * 0.72, h * 0.55, w * 0.75, h * 0.4, w * 0.78, h * 0.25);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      animId = requestAnimationFrame(renderHUD);
    };

    renderHUD();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [hudLayerEnabled, telemetry, selectedAthlete, activeHazards]);

  // Adjust canvas size to match video client rect
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && hudCanvasRef.current) {
      hudCanvasRef.current.width = videoRef.current.clientWidth || 800;
      hudCanvasRef.current.height = videoRef.current.clientHeight || 450;
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col gap-3 shadow-xl">
      {/* Feed Selector & Video Stage Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-cyan-400" />
          <div className="relative">
            <select
              id="coastal-feed-select"
              value={currentSource.id}
              onChange={(e) => {
                const found = availableSources.find((s) => s.id === e.target.value);
                if (found) onSelectSource(found);
              }}
              className="bg-slate-950 text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-8 cursor-pointer"
            >
              {availableSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label} [{source.tag}]
                </option>
              ))}
            </select>
          </div>

          <button
            id="open-upload-modal-btn"
            onClick={onOpenUploadModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Upload pre-recorded coastal surf session (.mp4, .mov, .mp3)"
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Ingest Session File</span>
          </button>
        </div>

        {/* HUD and Ingestion Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="toggle-hud-btn"
            onClick={() => setHudLayerEnabled(!hudLayerEnabled)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              hudLayerEnabled
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>HUD Reticles</span>
          </button>

          <button
            id="manual-audit-btn"
            onClick={handleManualAudit}
            disabled={isAnalyzingSnapshot}
            className="px-3 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-xs font-semibold border border-teal-500/60 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Perform instantaneous multimodal analysis on current frame"
          >
            {isAnalyzingSnapshot ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Scan className="w-3.5 h-3.5" />
            )}
            <span>Audit Frame</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport Container */}
      <div className="relative w-full aspect-video rounded-xl bg-black overflow-hidden border border-slate-800 shadow-2xl group">
        {/* Hidden Frame Grabber Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Element (Live camera or file or sample) */}
        {currentSource.category === 'live' && webcamError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 text-slate-300">
            <Camera className="w-12 h-12 text-rose-400 mb-3" />
            <p className="text-sm font-semibold text-rose-200 max-w-md">{webcamError}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const sample = availableSources.find((s) => s.category === 'sample');
                  if (sample) onSelectSource(sample);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
              >
                Switch to North Shore Banzai Cam
              </button>
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
              >
                Upload Session Video
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={currentSource.category !== 'live' ? currentSource.src : undefined}
            autoPlay
            playsInline
            loop={currentSource.category !== 'live'}
            muted
            onLoadedMetadata={handleVideoLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay HUD Canvas (Reticles, telemetry vectors, hazard targets) */}
        <canvas
          ref={hudCanvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full"
        />

        {/* Top-Left Live Recording / Streaming Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          {isStreamingActive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-600/80 text-rose-300 text-[11px] font-bold tracking-wider animate-pulse backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>LIVE WS STREAMING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300 text-[11px] font-medium backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>FEED PAUSED</span>
            </div>
          )}

          {lastCapturedTime && isStreamingActive && (
            <span className="text-[10px] text-slate-300/80 font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
              Frame: {lastCapturedTime}
            </span>
          )}
        </div>

        {/* Bottom Playback Overlay Bar (appears on hover or when paused) */}
        {currentSource.category !== 'live' && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 flex items-center justify-between text-white opacity-90 transition-opacity">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                    } else {
                      videoRef.current.play();
                    }
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <span className="text-xs font-mono text-slate-300">
                {currentSource.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Sample Coastal Stream</span>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.requestFullscreen) {
                      videoRef.current.requestFullscreen();
                    }
                  }
                }}
                className="p-1 rounded hover:text-white"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Description & Status Line */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
        <p className="line-clamp-1">{currentSource.description}</p>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-teal-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Stream: Video + Audio + Text</span>
        </div>
      </div>
    </div>
  );
};

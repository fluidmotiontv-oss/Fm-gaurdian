/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// PCM to Base64 encoder for 16kHz audio input
export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return output.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// 24kHz PCM Player for Gemini Live Audio Output
export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private audioQueue: Float32Array[] = [];
  private scheduledTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onLevelUpdate?: (level: number) => void;

  constructor(onLevelUpdate?: (level: number) => void) {
    this.onLevelUpdate = onLevelUpdate;
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Enqueue base64 PCM 24kHz audio chunk
  public enqueueBase64Chunk(base64Data: string) {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const binaryStr = window.atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // 16-bit PCM to Float32
      const dataView = new DataView(bytes.buffer);
      const sampleCount = Math.floor(bytes.byteLength / 2);
      const float32Array = new Float32Array(sampleCount);

      let sumSquare = 0;
      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        const floatVal = int16 / 32768.0;
        float32Array[i] = floatVal;
        sumSquare += floatVal * floatVal;
      }

      const rms = Math.sqrt(sumSquare / (sampleCount || 1));
      if (this.onLevelUpdate) {
        this.onLevelUpdate(Math.min(1, rms * 4));
      }

      this.scheduleBuffer(float32Array);
    } catch (err) {
      console.warn('Audio decoding chunk error:', err);
    }
  }

  private scheduleBuffer(samples: Float32Array) {
    if (!this.audioCtx) return;

    const buffer = this.audioCtx.createBuffer(1, samples.length, 24000);
    const channelData = buffer.getChannelData(0);
    channelData.set(samples);

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);

    const currentTime = this.audioCtx.currentTime;
    if (this.scheduledTime < currentTime) {
      this.scheduledTime = currentTime;
    }

    source.start(this.scheduledTime);
    this.scheduledTime += buffer.duration;
    this.activeSources.push(source);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0 && this.onLevelUpdate) {
        this.onLevelUpdate(0);
      }
    };
  }

  public interrupt() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.scheduledTime = this.audioCtx.currentTime;
    }
    if (this.onLevelUpdate) {
      this.onLevelUpdate(0);
    }
  }

  public close() {
    this.interrupt();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

// Speak aloud using browser SpeechSynthesis as fallback/reinforcement
export function speakCoachVoice(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  // Try to pick a natural authoritative voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      v.name.includes('Natural') ||
      v.name.includes('Daniel') ||
      v.name.includes('Oliver') ||
      v.name.includes('Arthur') ||
      v.lang.startsWith('en')
  );
  if (preferredVoice) utterance.voice = preferredVoice;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

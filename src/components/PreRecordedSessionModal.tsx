/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Upload, Film, Music, Check, ArrowRight } from 'lucide-react';
import { VideoSourceOption } from '../types';

interface PreRecordedSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSession: (source: VideoSourceOption) => void;
}

export const PreRecordedSessionModal: React.FC<PreRecordedSessionModalProps> = ({
  isOpen,
  onClose,
  onUploadSession,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!sessionTitle) {
        setSessionTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleConfirm = () => {
    if (!selectedFile) return;

    const fileUrl = URL.createObjectURL(selectedFile);
    const isAudio = selectedFile.type.startsWith('audio/');

    const newSource: VideoSourceOption = {
      id: `custom-session-${Date.now()}`,
      label: sessionTitle || selectedFile.name,
      category: 'upload',
      src: fileUrl,
      description: sessionNotes || `Imported ${isAudio ? 'Audio' : 'Video'} Session file: ${selectedFile.name}`,
      tag: isAudio ? 'AUDIO INGESTION' : 'VIDEO INGESTION',
    };

    onUploadSession(newSource);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide uppercase">
              Ingest Pre-Recorded Session File
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-400">
          Upload any coastal drone footage, beach camera capture, or pre-recorded audio session (.mp4, .mov, .webm, .wav, .mp3). The GuardianCoach pipeline will process frame tokens in real-time.
        </p>

        {/* Dropzone */}
        <label
          htmlFor="session-file-input"
          className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/60 transition-all hover:bg-slate-950"
        >
          {selectedFile ? (
            <div className="flex items-center gap-2 text-cyan-300">
              {selectedFile.type.startsWith('audio') ? (
                <Music className="w-6 h-6 text-teal-400" />
              ) : (
                <Film className="w-6 h-6 text-cyan-400" />
              )}
              <span className="text-xs font-semibold">{selectedFile.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-500" />
              <span className="text-xs font-medium text-slate-300">
                Click to browse or drag &amp; drop video / audio file
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                MP4, WEBM, MOV, MP3, WAV (Max 500MB)
              </span>
            </>
          )}
          <input
            id="session-file-input"
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Metadata Inputs */}
        <div className="space-y-2 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Session Title</label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g. Kai Supertubes Morning Session"
              className="w-full bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Coaching &amp; Safety Focus</label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. Review takeoff velocity, bottom turn rail compression, and outside rip channel"
              className="w-full bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedFile}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ingest &amp; Start Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

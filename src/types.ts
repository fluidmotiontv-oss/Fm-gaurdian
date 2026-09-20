/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OperatingMode = 'hybrid' | 'coach' | 'guardian';

export interface AthleteProfile {
  id: string;
  name: string;
  relation: string;
  age: number;
  boardType: string;
  currentFocus: string;
  avatarColor: string;
  recentTips: string[];
}

export interface HazardAlert {
  id: string;
  timestamp: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'distress' | 'rip_current' | 'collision' | 'impact_zone' | 'wildlife';
  title: string;
  description: string;
  coordinates?: { x: number; y: number }; // normalized 0-1 on video
  acknowledged?: boolean;
}

export interface CoachingTranscriptItem {
  id: string;
  timestamp: string;
  sender: 'coach' | 'athlete' | 'system' | 'guardian';
  text: string;
  modality: 'audio' | 'text' | 'video_event';
  athleteId?: string;
  isAlert?: boolean;
}

export interface CoastalTelemetry {
  swellHeightM: number;
  swellPeriodSec: number;
  tideStage: 'Low Rising' | 'High Falling' | 'Slack Water' | 'Dead Low';
  windKts: number;
  windDirection: string;
  waterTempC: number;
  distressRiskScore: number; // 0 - 100
  activeSurfersCount: number;
  swimmersMonitored: number;
}

export interface VideoSourceOption {
  id: string;
  label: string;
  category: 'live' | 'sample' | 'upload';
  src?: string;
  description: string;
  tag: string;
  simulatedAlerts?: HazardAlert[];
}

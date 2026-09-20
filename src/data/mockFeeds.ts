/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AthleteProfile, CoastalTelemetry, HazardAlert, VideoSourceOption } from '../types';

export const ATHLETE_PROFILES: AthleteProfile[] = [
  {
    id: 'kai',
    name: 'Nephew Kai',
    relation: 'Nephew (16yo Grom Prodigy)',
    age: 16,
    boardType: '5\'9" Epoxy Shortboard (Thruster)',
    currentFocus: 'Rail-to-rail drive, vertical fin-release snaps, aerial landing absorption',
    avatarColor: 'bg-emerald-500',
    recentTips: [
      'Keep leading arm low on bottom turn to load compression.',
      'Spot the landing transition before disengaging fins.',
      'Watch priority rotation at the outside peak.'
    ]
  },
  {
    id: 'leo',
    name: 'Nephew Leo',
    relation: 'Nephew (12yo Junior Surfer)',
    age: 12,
    boardType: '5\'4" Soft-Top / Fish',
    currentFocus: 'Paddle cadence, wave entry angle, quick pop-up stability',
    avatarColor: 'bg-sky-500',
    recentTips: [
      'Two extra power strokes right as the wave lifts the tail.',
      'Widen foot stance slightly when transitioning from drop to bottom turn.',
      'Always stay out of the inside rip zone near the groin.'
    ]
  },
  {
    id: 'maya',
    name: 'Niece Maya',
    relation: 'Niece (14yo Longboard Stylist)',
    age: 14,
    boardType: '9\'2" Single-Fin Classic Log',
    currentFocus: 'Smooth cross-stepping cadence, high-line trim speed, nose-ride hang-five',
    avatarColor: 'bg-amber-500',
    recentTips: [
      'Wait for the pocket curl to form before initiating the second cross-step.',
      'Gently arch the back to feather trim speed while perched on the nose.',
      'Signal swimmers early when peeling through the shallow inside.'
    ]
  },
  {
    id: 'community',
    name: 'Community Lineup',
    relation: 'Open Coastal Beach & Public Swimmers',
    age: 0,
    boardType: 'Mixed Craft & Body Surfers',
    currentFocus: 'Lineup collision avoidance, rip drift tracking, swimmer distress triage',
    avatarColor: 'bg-teal-500',
    recentTips: [
      'Enforce no-drop-in etiquette on set waves.',
      'Alert public bathers drifting past the flagged flags.',
      'Monitor leash integrity in heavy shorebreak.'
    ]
  }
];

export const INITIAL_TELEMETRY: CoastalTelemetry = {
  swellHeightM: 1.8,
  swellPeriodSec: 13,
  tideStage: 'Low Rising',
  windKts: 8,
  windDirection: 'Offshore (ENE)',
  waterTempC: 21.5,
  distressRiskScore: 18,
  activeSurfersCount: 7,
  swimmersMonitored: 12
};

export const INITIAL_HAZARDS: HazardAlert[] = [
  {
    id: 'hz-1',
    timestamp: '16:20:12',
    level: 'medium',
    category: 'rip_current',
    title: 'Rip Current Velocity Spike',
    description: 'Offshore channel 45m north of the main peak showing 1.2 m/s seaward drift. Swimmers advised to stay inside flagged zone.',
    coordinates: { x: 0.68, y: 0.42 },
    acknowledged: false
  },
  {
    id: 'hz-2',
    timestamp: '16:21:40',
    level: 'low',
    category: 'collision',
    title: 'Drop-in Caution at Outside Peak',
    description: 'Two riders tracking identical left set. Kai holds inside priority line.',
    coordinates: { x: 0.35, y: 0.38 },
    acknowledged: false
  }
];

export const VIDEO_SOURCES: VideoSourceOption[] = [
  {
    id: 'webcam',
    label: 'Live Coastal Camera / Device Feed',
    category: 'live',
    description: 'Hardware webcam and microphone for live on-the-beach coaching or live camera stream.',
    tag: 'LIVE FEED'
  },
  {
    id: 'sample-pipeline',
    label: 'North Shore Banzai Reef Cam (High Energy)',
    category: 'sample',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Heavy shore-pounding break, sharp reef safety watch, barrel technique.',
    tag: 'SAMPLE ARCHIVE',
    simulatedAlerts: [
      {
        id: 'sim-pipe-1',
        timestamp: '16:24:00',
        level: 'high',
        category: 'impact_zone',
        title: 'Shallow Reef Impact Zone Alert',
        description: 'Heavy set washing over inside shelf. Advise body protection stance.',
        coordinates: { x: 0.52, y: 0.65 }
      }
    ]
  },
  {
    id: 'sample-huntington',
    label: 'Huntington Pier Grom Coaching Cam',
    category: 'sample',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    description: 'Grom training grounds, pier piling collision buffer, rip trench monitoring.',
    tag: 'GROM TRAINING'
  },
  {
    id: 'sample-byron',
    label: 'Pass Point Break (Maya Longboard Session)',
    category: 'sample',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'Clean peeling right-hander for classic style, cross-stepping, and swimmer buffer.',
    tag: 'LONGBOARD STYLE'
  }
];

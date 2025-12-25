export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
}

export interface ProcessingStats {
  total: number;
  completed: number;
  failed: number;
}

export interface QualityMetrics {
  overall: number;
  edgeQuality: number; // 0-100
  colorAccuracy: number; // 0-100 (Delta E derived)
  realism: number; // 0-100
  deltaE: number; // Lower is better
}

export type ViewAngle = 'front' | 'side' | 'back' | 'detail' | 'flatlay';

export interface StylistSuggestion {
  id: string;
  theme: string;
  reasoning: string;
  prompt: string;
  colorPalette: string[];
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  originalName: string;
  confidenceScore?: number;
  qualityMetrics?: QualityMetrics;
  generationRetries?: number;
  viewAngle?: ViewAngle;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  prompt: string;
  category: 'Studio' | 'Lifestyle' | 'Outdoor' | 'Creative';
}

export interface ShadowConfig {
  enabled: boolean;
  mode: 'soft' | 'hard' | 'floating';
  opacity: number; // 0-100
  angle: number; // degrees
}

export interface PlatformPreset {
  id: 'amazon' | 'myntra' | 'instagram' | 'custom';
  name: string;
  aspectRatio: string;
  forceWhiteBackground: boolean;
  allowShadows: boolean;
  exportFormat: 'jpg' | 'png';
  description: string;
}

export interface BatchConfig {
  shadows: ShadowConfig;
  platform: PlatformPreset['id'];
  consistencySeed: number;
  fabricProtection: boolean;
  autoRegenerate: boolean;
}
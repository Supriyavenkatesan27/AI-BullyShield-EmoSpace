// ============================================================
// AI BullyShield API — Configuration
// ============================================================

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

/** AI mode: "live" uses Gemini API, "demo" uses deterministic local analysis */
export type AiMode = 'demo' | 'live';

export interface AppConfig {
  /** Server port */
  port: number;
  /** Node environment */
  nodeEnv: string;
  /** AI analysis mode */
  aiMode: AiMode;
  /** Gemini API key (required for live mode) */
  geminiApiKey: string;
  /** Gemini model name */
  geminiModel: string;
  /** Rate limit window in milliseconds */
  rateLimitWindowMs: number;
  /** Max requests per rate limit window */
  rateLimitMax: number;
  /** Allowed CORS origins */
  corsOrigins: string[];
  /** Firebase project ID */
  firebaseProjectId: string;
  /** Firebase service account key JSON path */
  firebaseServiceAccountPath: string;
  /** Whether Firebase is configured */
  firebaseEnabled: boolean;
}

function parseCorsList(raw: string | undefined): string[] {
  if (!raw) return ['*'];
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function configuredValue(raw: string | undefined): string {
  const value = raw?.trim() || '';
  return /^(your[_-]|your\.|replace[_-]|example\b)/i.test(value) ? '' : value;
}

function determineAiMode(): AiMode {
  const explicit = process.env.AI_MODE?.toLowerCase();
  if (explicit === 'live') return configuredValue(process.env.GEMINI_API_KEY) ? 'live' : 'demo';
  if (explicit === 'demo') return 'demo';
  // Auto-detect: if Gemini key is set, default to live
  return configuredValue(process.env.GEMINI_API_KEY) ? 'live' : 'demo';
}

function buildConfig(): AppConfig {
  const aiMode = determineAiMode();
  const firebaseProjectId = configuredValue(process.env.FIREBASE_PROJECT_ID);
  const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
  const firebaseEnabled = !!(firebaseProjectId || configuredValue(firebaseServiceAccountPath));

  const config: AppConfig = {
    port: parseInt(process.env.API_PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    aiMode,
    geminiApiKey: configuredValue(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
    corsOrigins: parseCorsList(process.env.CORS_ORIGINS),
    firebaseProjectId,
    firebaseServiceAccountPath: configuredValue(firebaseServiceAccountPath),
    firebaseEnabled,
  };

  return config;
}

/** Validate that required config values are present for the chosen mode */
export function validateConfig(config: AppConfig): string[] {
  const warnings: string[] = [];

  if (config.aiMode === 'live' && !config.geminiApiKey) {
    warnings.push(
      'AI_MODE is "live" but GEMINI_API_KEY is not set. Falling back to demo mode.'
    );
  }

  if (!config.firebaseEnabled) {
    warnings.push(
      'Firebase is not configured. Report endpoints will return errors. ' +
      'Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH to enable.'
    );
  }

  return warnings;
}

/** The application configuration singleton */
export const config: AppConfig = buildConfig();

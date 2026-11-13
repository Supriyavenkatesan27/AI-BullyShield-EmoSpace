import { describe, expect, it } from 'vitest';
import { analyzeRequestSchema, demoAnalyze, HarmCategory, RiskLevel } from '@bullyshield/shared';

describe('API request and demo behavior', () => {
  it('rejects empty and oversized analysis requests', () => {
    expect(analyzeRequestSchema.safeParse({ text: '' }).success).toBe(false);
    expect(analyzeRequestSchema.safeParse({ text: 'x'.repeat(5001) }).success).toBe(false);
  });
  it('labels deterministic analysis as demo and flags threats for support', () => {
    const result = demoAnalyze('I will hurt you');
    expect(result.category).toBe(HarmCategory.THREAT);
    expect(result.riskLevel).toBe(RiskLevel.HIGH);
    expect(result.isDemoMode).toBe(true);
    expect(result.shouldSuggestReport).toBe(true);
  });
});

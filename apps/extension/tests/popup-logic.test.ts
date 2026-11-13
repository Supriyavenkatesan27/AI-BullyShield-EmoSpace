import { describe, expect, it } from 'vitest';
import { demoAnalyze, demoSafeReplies, HarmCategory } from '@bullyshield/shared';

describe('extension demo fallback', () => {
  it('returns a clearly labeled analysis for user supplied text', () => {
    const result = demoAnalyze('You are a loser');
    expect(result.category).toBe(HarmCategory.CYBERBULLYING);
    expect(result.isDemoMode).toBe(true);
  });
  it('offers three reviewable safe reply styles', () => {
    const result = demoSafeReplies('hostile message');
    expect(result.replies).toHaveLength(3);
    expect(result.isDemoMode).toBe(true);
    expect(result.disclaimer).toContain('Review');
  });
});

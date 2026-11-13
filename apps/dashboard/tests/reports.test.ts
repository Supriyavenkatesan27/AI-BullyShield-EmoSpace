import { describe, expect, it } from 'vitest';
import { filterReports, type Report } from '../src/services/reportService';

const report: Report = { id: 'r1', category: 'harassment', riskLevel: 'high', status: 'open', description: 'Repeated unwanted messages', isAnonymous: true, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), counselorNotes: [] };

describe('counselor report filtering', () => {
  it('filters by status and report text', () => {
    expect(filterReports([report], { status: 'resolved' })).toHaveLength(0);
    expect(filterReports([report], { search: 'unwanted' })).toHaveLength(1);
    expect(filterReports([report], { search: 'missing' })).toHaveLength(0);
  });
});

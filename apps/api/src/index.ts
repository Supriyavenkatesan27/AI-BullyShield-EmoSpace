import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { analyzeRequestSchema, safeReplyRequestSchema, reportRequestSchema, demoAnalyze, demoSafeReplies, ReportStatus } from '@bullyshield/shared';
import { config } from './config.js';
import { analyzeText, generateSafeReplies } from './services/gemini.js';
import { createReport, getReports, updateReport } from './services/firebase.js';
import { requireCounselor } from './middleware/auth.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({ windowMs: config.rateLimitWindowMs, limit: config.rateLimitMax, standardHeaders: true, legacyHeaders: false }));
app.get('/health', (_req, res) => res.json({ success: true, mode: config.aiMode === 'live' && !!config.geminiApiKey ? 'live' : 'demo' }));
app.post('/api/analyze', async (req, res) => {
  const parsed = analyzeRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message });
  try {
    const live = config.aiMode === 'live' && !!config.geminiApiKey;
    const data = live ? await analyzeText(parsed.data.text) : demoAnalyze(parsed.data.text);
    res.json({ success: true, data: { ...data, isDemoMode: !live } });
  } catch (e) { res.status(502).json({ success: false, error: e instanceof Error ? e.message : 'Analysis unavailable' }); }
});
app.post('/api/replies', async (req, res) => {
  const parsed = safeReplyRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message });
  try {
    const live = config.aiMode === 'live' && !!config.geminiApiKey;
    const data = live ? await generateSafeReplies(parsed.data.text) : demoSafeReplies(parsed.data.text);
    res.json({ success: true, data: { ...data, isDemoMode: !live } });
  } catch (e) { res.status(502).json({ success: false, error: e instanceof Error ? e.message : 'Replies unavailable' }); }
});
app.post('/api/reports', async (req, res) => {
  const parsed = reportRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message });
  if (!config.firebaseEnabled) return res.status(503).json({ success: false, error: 'Reporting is unavailable until Firebase is configured.' });
  try {
    const data = parsed.data;
    const analysisResult = data.analysisResult ? {
      ...data.analysisResult,
      isDemoMode: data.analysisResult.isDemoMode ?? true,
      timestamp: data.analysisResult.timestamp ?? new Date().toISOString(),
    } : undefined;
    const { id } = await createReport({ ...data, analysisResult, status: ReportStatus.SUBMITTED });
    res.status(201).json({ success: true, data: { id } });
  }
  catch { res.status(502).json({ success: false, error: 'Report could not be saved. Please try again.' }); }
});
app.get('/api/reports', requireCounselor, async (_req, res) => {
  if (!config.firebaseEnabled) return res.status(503).json({ success: false, error: 'Firebase is not configured.' });
  try { res.json({ success: true, data: await getReports() }); } catch { res.status(502).json({ success: false, error: 'Reports unavailable.' }); }
});
app.patch('/api/reports/:id', requireCounselor, async (req, res) => {
  if (!config.firebaseEnabled) return res.status(503).json({ success: false, error: 'Firebase is not configured.' });
  const allowed = ['submitted', 'under_review', 'assigned', 'resolved', 'closed'];
  if (typeof req.body.status !== 'string' || !allowed.includes(req.body.status)) return res.status(400).json({ success: false, error: 'Invalid report status.' });
  try { await updateReport(req.params.id, { status: req.body.status as ReportStatus, assignedCounselor: typeof req.body.assignedCounselor === 'string' ? req.body.assignedCounselor.slice(0, 200) : undefined, resolution: typeof req.body.resolution === 'string' ? req.body.resolution.slice(0, 5000) : undefined }); res.json({ success: true }); }
  catch { res.status(502).json({ success: false, error: 'Report could not be updated.' }); }
});
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error('Request failed:', err instanceof Error ? err.message : 'unknown'); res.status(500).json({ success: false, error: 'Unexpected server error.' }); });
if (process.env.NODE_ENV !== 'test') app.listen(config.port, () => console.log(`BullyShield API listening on http://localhost:${config.port} (${config.aiMode} mode)`));
export default app;

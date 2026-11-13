import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { demoAnalyze, demoSafeReplies, type AnalysisResult, type SafeReplyResponse } from '@bullyshield/shared';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
function App() {
  const [text, setText] = useState(''); const [result, setResult] = useState<AnalysisResult | null>(null);
  const [replies, setReplies] = useState<SafeReplyResponse | null>(null); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [reportOpen, setReportOpen] = useState(false); const [reviewReport, setReviewReport] = useState(false);
  const [description, setDescription] = useState(''); const [domain, setDomain] = useState(''); const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  useEffect(() => { chrome.storage?.local.get('pendingText').then(({ pendingText }) => { if (pendingText) setText(pendingText); return chrome.storage.local.remove('pendingText'); }); }, []);
  async function analyze() { if (!text.trim()) return; setBusy(true); setNotice(''); setReplies(null); try {
    const response = await fetch(`${API}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!response.ok) throw new Error('API unavailable'); const body = await response.json(); setResult(body.data);
  } catch { setResult(demoAnalyze(text)); setNotice('Demo mode · API unavailable; this estimate uses simple keyword matching.'); } finally { setBusy(false); } }
  async function suggest() { try { const r = await fetch(`${API}/api/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }); if (!r.ok) throw Error(); setReplies((await r.json()).data); } catch { setReplies(demoSafeReplies(text)); } }
  async function submitReport() {
    try { setBusy(true); const r = await fetch(`${API}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: result?.category || 'uncertain', riskLevel: result?.riskLevel || 'low', description, messageExcerpt: text.trim() || undefined, websiteDomain: domain.trim() || undefined, additionalNotes: notes.trim() || undefined, isAnonymous: true }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Submission failed'); setNotice('Report submitted. Thank you for choosing to share this.'); setReportOpen(false); setReviewReport(false);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Report could not be submitted.'); } finally { setBusy(false); }
  }
  return <main><header><div className="logo">E</div><div><h1>EmoSpace</h1><p>AI BullyShield · Protection + Healing</p></div><span className="shield">● Ready</span></header>
    <section className="card"><label htmlFor="text">Analyze text you choose</label><textarea id="text" maxLength={5000} placeholder="Paste a message here, or select text on a page and right-click…" value={text} onChange={e=>setText(e.target.value)} />
      <div className="row"><small>{text.length}/5000 · Only analyzed when you press the button</small><button disabled={busy || !text.trim()} onClick={analyze}>{busy ? 'Analyzing…' : 'Analyze text'}</button></div></section>
    {notice && <p role="status" className="notice">{notice}</p>}
    {result && <section className="card result"><div className="row"><h2>{result.category.replace(/_/g,' ')}</h2><span className={`risk ${result.riskLevel}`}>{result.riskLevel} risk</span></div><p>{result.explanation}</p><p><b>Suggested next step:</b> {result.recommendedAction}</p><small>{result.isDemoMode ? 'Demo estimate' : 'AI estimate'} · {Math.round(result.confidence*100)}% confidence</small>
      <div className="row actions"><button className="secondary" onClick={suggest}>Suggest safe replies</button><button className="secondary" onClick={()=>{setReportOpen(true);setReviewReport(false);setDescription(text.trim());setConsent(false)}}>Report voluntarily</button></div></section>}
    {reportOpen && <section className="card"><h2>{reviewReport?'Review before sending':'Voluntary incident report'}</h2><p className="muted">Sharing is your choice. Your report is sent only after you confirm it below.</p>
      {reviewReport ? <><p><b>Category and risk:</b> {result?.category||'uncertain'} · {result?.riskLevel||'low'}</p><p><b>Description:</b> {description}</p>{text.trim()&&<p><b>Selected excerpt:</b> {text}</p>}<p><b>Website:</b> {domain||'Not provided'} · <b>Reporter identity:</b> Anonymous</p>{notes&&<p><b>Additional notes:</b> {notes}</p>}
        <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I consent to submit this information for counselor review.</label><div className="row"><button className="secondary" onClick={()=>setReviewReport(false)}>Edit report</button><button disabled={!consent||busy} onClick={()=>void submitReport()}>{busy?'Sending…':'Confirm and send'}</button></div></>
        : <><label htmlFor="report-description">What happened? *</label><textarea id="report-description" maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what happened (at least 10 characters)…"/><label className="field-label" htmlFor="report-domain">Website domain (optional)</label><input id="report-domain" maxLength={500} value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com"/><label className="field-label" htmlFor="report-notes">Additional notes (optional)</label><textarea id="report-notes" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anything else you want the counselor to know…"/><p className="muted">This report is anonymous; the extension does not collect an account identity. {text.trim()?'The selected/analyzed text will be included as the excerpt.':'No message excerpt will be included.'} Report time is recorded by the service.</p><div className="row"><button className="secondary" onClick={()=>setReportOpen(false)}>Cancel</button><button disabled={description.trim().length<10} onClick={()=>setReviewReport(true)}>Review report</button></div></>}
    </section>}
    {replies && <section className="card"><h2>Possible replies</h2><p className="muted">Review and adapt. Nothing is sent automatically.</p>{replies.replies.map(reply=><article key={reply.style}><b>{reply.label}</b><p>{reply.text}</p><button className="secondary" onClick={()=>navigator.clipboard.writeText(reply.text)}>Copy</button></article>)}</section>}
    <section className="card support"><h2>Take a moment</h2><p>You deserve to feel safe. Try a slow breath in for four counts and out for six. Save evidence if it feels safe, block or report through the platform, and talk with someone you trust.</p><p>If there is immediate danger, contact local emergency services or a trusted adult now.</p></section>
    <footer>AI estimates can be wrong. Your text is sent to the local API only after you choose Analyze.</footer></main>;
}
createRoot(document.getElementById('root')!).render(<App />);

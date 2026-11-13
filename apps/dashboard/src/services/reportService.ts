import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFirebaseConfigured } from '../config/firebase';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';
export type ReportCategory =
  | 'cyberbullying'
  | 'harassment'
  | 'hate_speech'
  | 'threats'
  | 'sexual_content'
  | 'self_harm'
  | 'other';

export interface CounselorNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Report {
  id: string;
  category: ReportCategory;
  riskLevel: RiskLevel;
  status: ReportStatus;
  description: string;
  messageExcerpt?: string;
  websiteDomain?: string;
  isAnonymous: boolean;
  submittedAt: string;
  updatedAt: string;
  assignedCounselor?: string;
  counselorNotes: CounselorNote[];
  resolution?: string;
  aiAnalysis?: string;
  isDemo?: boolean;
}

export interface ReportFilters {
  status?: ReportStatus | '';
  riskLevel?: RiskLevel | '';
  category?: ReportCategory | '';
  search?: string;
}

export interface DashboardStats {
  totalReports: number;
  openReports: number;
  highRiskReports: number;
  resolvedReports: number;
  reportsByCategory: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Demo Data                                                         */
/* ------------------------------------------------------------------ */

const DEMO_REPORTS: Report[] = [
  {
    id: 'DEMO-001',
    category: 'cyberbullying',
    riskLevel: 'high',
    status: 'open',
    description: 'Student reports repeated name-calling and exclusion from group chats by classmates.',
    messageExcerpt: '"Nobody wants you here, just leave the group already"',
    websiteDomain: 'instagram.com',
    isAnonymous: true,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    counselorNotes: [],
    aiAnalysis: 'High confidence of cyberbullying detected. Pattern indicates repeated targeted harassment with exclusionary language.',
    isDemo: true,
  },
  {
    id: 'DEMO-002',
    category: 'threats',
    riskLevel: 'high',
    status: 'open',
    description: 'Threatening messages received via direct messages on social media platform.',
    messageExcerpt: '"You better watch out at school tomorrow"',
    websiteDomain: 'twitter.com',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    counselorNotes: [
      {
        id: 'note-001',
        author: 'Dr. Martinez',
        content: 'Contacted student\'s parents. Scheduling in-person meeting for tomorrow morning.',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
    isDemo: true,
  },
  {
    id: 'DEMO-003',
    category: 'harassment',
    riskLevel: 'medium',
    status: 'in_progress',
    description: 'Ongoing harassment through comment sections on multiple posts.',
    messageExcerpt: '"Lol look at this loser trying to be cool"',
    websiteDomain: 'tiktok.com',
    isAnonymous: true,
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Ms. Johnson',
    counselorNotes: [
      {
        id: 'note-002',
        author: 'Ms. Johnson',
        content: 'Initial assessment complete. Student shows signs of anxiety. Recommended daily check-ins.',
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
    ],
    aiAnalysis: 'Medium risk harassment detected. Repeated negative comments targeting appearance and social status.',
    isDemo: true,
  },
  {
    id: 'DEMO-004',
    category: 'hate_speech',
    riskLevel: 'high',
    status: 'in_progress',
    description: 'Discriminatory language targeting student\'s ethnicity found in a group chat.',
    websiteDomain: 'discord.com',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Dr. Martinez',
    counselorNotes: [
      {
        id: 'note-003',
        author: 'Dr. Martinez',
        content: 'Meeting held with all parties. School administration informed per policy.',
        createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'note-004',
        author: 'Dr. Martinez',
        content: 'Follow-up session scheduled. Student feeling supported. Connecting with peer support group.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    isDemo: true,
  },
  {
    id: 'DEMO-005',
    category: 'self_harm',
    riskLevel: 'high',
    status: 'open',
    description: 'Student expressing self-harm ideation in online journal posts.',
    websiteDomain: 'tumblr.com',
    isAnonymous: true,
    submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    counselorNotes: [],
    aiAnalysis: 'URGENT: Self-harm indicators detected. Immediate counselor intervention recommended.',
    isDemo: true,
  },
  {
    id: 'DEMO-006',
    category: 'cyberbullying',
    riskLevel: 'low',
    status: 'resolved',
    description: 'Mild teasing in class group chat. Students resolved the issue after mediation.',
    websiteDomain: 'whatsapp.com',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Ms. Johnson',
    counselorNotes: [
      {
        id: 'note-005',
        author: 'Ms. Johnson',
        content: 'Mediation session conducted. Both students apologized and agreed to respectful communication.',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    resolution: 'Resolved through peer mediation. Both students completed conflict resolution workshop.',
    isDemo: true,
  },
  {
    id: 'DEMO-007',
    category: 'sexual_content',
    riskLevel: 'high',
    status: 'in_progress',
    description: 'Inappropriate images being shared without consent in school group.',
    websiteDomain: 'snapchat.com',
    isAnonymous: true,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Dr. Martinez',
    counselorNotes: [
      {
        id: 'note-006',
        author: 'Dr. Martinez',
        content: 'Law enforcement notified per mandatory reporting requirements. Supporting affected student.',
        createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    isDemo: true,
  },
  {
    id: 'DEMO-008',
    category: 'other',
    riskLevel: 'none',
    status: 'dismissed',
    description: 'Report submitted by mistake. Student confirmed no issue.',
    websiteDomain: 'google.com',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    counselorNotes: [],
    resolution: 'Dismissed — submitted by mistake.',
    isDemo: true,
  },
  {
    id: 'DEMO-009',
    category: 'harassment',
    riskLevel: 'medium',
    status: 'resolved',
    description: 'Repeated unwanted contact from former friend. Blocking wasn\'t effective as new accounts were created.',
    websiteDomain: 'instagram.com',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Ms. Johnson',
    counselorNotes: [
      {
        id: 'note-007',
        author: 'Ms. Johnson',
        content: 'Worked with both students. Set clear boundaries. Monitoring situation.',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    resolution: 'Boundaries established. No further contact attempts in 5 days. Case closed with follow-up scheduled.',
    isDemo: true,
  },
  {
    id: 'DEMO-010',
    category: 'cyberbullying',
    riskLevel: 'medium',
    status: 'open',
    description: 'Student being targeted with memes and edited photos shared across multiple platforms.',
    messageExcerpt: 'Multiple edited images found mocking student\'s appearance',
    websiteDomain: 'reddit.com',
    isAnonymous: true,
    submittedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    counselorNotes: [],
    aiAnalysis: 'Image-based cyberbullying detected. Multiple instances across platforms suggest coordinated targeting.',
    isDemo: true,
  },
  {
    id: 'DEMO-011',
    category: 'threats',
    riskLevel: 'medium',
    status: 'resolved',
    description: 'Veiled threats made during online gaming session. Student felt unsafe.',
    websiteDomain: 'twitch.tv',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Dr. Martinez',
    counselorNotes: [
      {
        id: 'note-008',
        author: 'Dr. Martinez',
        content: 'Investigation concluded. Threats were from an out-of-state individual. Platform notified and account banned.',
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    resolution: 'Platform account responsible was banned. Student provided safety resources for online gaming.',
    isDemo: true,
  },
  {
    id: 'DEMO-012',
    category: 'cyberbullying',
    riskLevel: 'low',
    status: 'open',
    description: 'Student reports being left out of social plans that are organized through group chats.',
    websiteDomain: 'whatsapp.com',
    isAnonymous: true,
    submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    counselorNotes: [],
    isDemo: true,
  },
  {
    id: 'DEMO-013',
    category: 'hate_speech',
    riskLevel: 'medium',
    status: 'resolved',
    description: 'Homophobic slurs used in school forum. Multiple students reported the same user.',
    websiteDomain: 'school-forum.edu',
    isAnonymous: false,
    submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCounselor: 'Ms. Johnson',
    counselorNotes: [
      {
        id: 'note-009',
        author: 'Ms. Johnson',
        content: 'Forum moderation updated. Responsible student received counseling on inclusive language. School-wide awareness session planned.',
        createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    resolution: 'Addressed through disciplinary action, counseling, and school-wide education initiative.',
    isDemo: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: convert Firestore doc to Report                           */
/* ------------------------------------------------------------------ */

function docToReport(id: string, data: DocumentData): Report {
  const created = data.createdAt ?? data.submittedAt;
  const rawStatus = data.status ?? 'submitted';
  const status: ReportStatus = rawStatus === 'submitted' ? 'open' : rawStatus === 'under_review' || rawStatus === 'assigned' ? 'in_progress' : rawStatus === 'closed' ? 'dismissed' : rawStatus;
  return {
    id,
    category: data.category ?? 'other',
    riskLevel: data.riskLevel ?? 'none',
    status,
    description: data.description ?? '',
    messageExcerpt: data.messageExcerpt,
    websiteDomain: data.websiteDomain,
    isAnonymous: data.isAnonymous ?? false,
    submittedAt: created instanceof Timestamp
      ? created.toDate().toISOString()
      : created ?? new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt ?? new Date().toISOString(),
    assignedCounselor: data.assignedCounselor,
    counselorNotes: data.counselorNotes ?? [],
    resolution: data.resolution,
    aiAnalysis: data.aiAnalysis,
  };
}

function firestoreStatus(status: ReportStatus): string {
  if (status === 'open') return 'submitted';
  if (status === 'in_progress') return 'under_review';
  if (status === 'dismissed') return 'closed';
  return status;
}

/* ------------------------------------------------------------------ */
/*  Filtering helper (used for both demo & Firestore)                 */
/* ------------------------------------------------------------------ */

export function filterReports(reports: Report[], filters: ReportFilters): Report[] {
  let filtered = [...reports];

  if (filters.status) {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters.riskLevel) {
    filtered = filtered.filter((r) => r.riskLevel === filters.riskLevel);
  }
  if (filters.category) {
    filtered = filtered.filter((r) => r.category === filters.category);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.messageExcerpt && r.messageExcerpt.toLowerCase().includes(q)) ||
        (r.websiteDomain && r.websiteDomain.toLowerCase().includes(q))
    );
  }

  return filtered;
}

/* ------------------------------------------------------------------ */
/*  Stats helper                                                      */
/* ------------------------------------------------------------------ */

export function calculateStats(reports: Report[]): DashboardStats {
  const stats: DashboardStats = {
    totalReports: reports.length,
    openReports: 0,
    highRiskReports: 0,
    resolvedReports: 0,
    reportsByCategory: {},
  };

  for (const report of reports) {
    // Count statuses
    if (report.status === 'open' || report.status === 'in_progress') {
      stats.openReports++;
    }
    if (report.status === 'resolved') {
      stats.resolvedReports++;
    }
    if (report.riskLevel === 'high') {
      stats.highRiskReports++;
    }

    // Count categories
    const cat = report.category;
    stats.reportsByCategory[cat] = (stats.reportsByCategory[cat] || 0) + 1;
  }

  return stats;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/** Fetch all reports, optionally filtered. Returns demo data when Firebase is not configured. */
export async function getReports(filters?: ReportFilters): Promise<Report[]> {
  if (!isFirebaseConfigured() || !db) {
    let reports = [...DEMO_REPORTS];
    if (filters) {
      reports = filterReports(reports, filters);
    }
    // Sort by submittedAt descending
    reports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return reports;
  }

  try {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (filters?.riskLevel) {
      constraints.push(where('riskLevel', '==', filters.riskLevel));
    }
    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    const q = query(collection(db, 'reports'), ...constraints);
    const snapshot = await getDocs(q);
    let reports = snapshot.docs.map((d) => docToReport(d.id, d.data()));

    if (filters?.status) reports = reports.filter((report) => report.status === filters.status);

    // Client-side text search (Firestore doesn't support full-text)
    if (filters?.search) {
      reports = filterReports(reports, { search: filters.search });
    }

    return reports;
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw new Error('Failed to load reports. Please try again.');
  }
}

/** Fetch recent reports (limited count). */
export async function getRecentReports(count: number = 10): Promise<Report[]> {
  if (!isFirebaseConfigured() || !db) {
    return [...DEMO_REPORTS]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, count);
  }

  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docToReport(d.id, d.data()));
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    throw new Error('Failed to load recent reports.');
  }
}

/** Fetch a single report by ID. */
export async function getReport(reportId: string): Promise<Report | null> {
  if (!isFirebaseConfigured() || !db) {
    return DEMO_REPORTS.find((r) => r.id === reportId) ?? null;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return docToReport(snapshot.id, snapshot.data());
  } catch (error) {
    console.error('Error fetching report:', error);
    throw new Error('Failed to load report details.');
  }
}

/** Get aggregated dashboard statistics. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const reports = await getReports();
  return calculateStats(reports);
}

/** Update the status of a report. */
export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    // In demo mode, update in-memory
    const report = DEMO_REPORTS.find((r) => r.id === reportId);
    if (report) {
      report.status = status;
      report.updatedAt = new Date().toISOString();
    }
    return;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      status: firestoreStatus(status),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    throw new Error('Failed to update report status.');
  }
}

/** Assign a counselor to a report. */
export async function assignCounselor(reportId: string, counselorName: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    const report = DEMO_REPORTS.find((r) => r.id === reportId);
    if (report) {
      report.assignedCounselor = counselorName;
      report.updatedAt = new Date().toISOString();
    }
    return;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      assignedCounselor: counselorName,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error assigning counselor:', error);
    throw new Error('Failed to assign counselor.');
  }
}

/** Add a counselor note to a report. */
export async function addCounselorNote(
  reportId: string,
  author: string,
  content: string
): Promise<CounselorNote> {
  const note: CounselorNote = {
    id: `note-${Date.now()}`,
    author,
    content,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured() || !db) {
    const report = DEMO_REPORTS.find((r) => r.id === reportId);
    if (report) {
      report.counselorNotes.push(note);
      report.updatedAt = new Date().toISOString();
    }
    return note;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      counselorNotes: arrayUnion(note),
      updatedAt: Timestamp.now(),
    });
    return note;
  } catch (error) {
    console.error('Error adding note:', error);
    throw new Error('Failed to add counselor note.');
  }
}

/** Resolve a report with a resolution message. */
export async function resolveReport(reportId: string, resolution: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    const report = DEMO_REPORTS.find((r) => r.id === reportId);
    if (report) {
      report.status = 'resolved';
      report.resolution = resolution;
      report.updatedAt = new Date().toISOString();
    }
    return;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, {
      status: 'resolved',
      resolution,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error resolving report:', error);
    throw new Error('Failed to resolve report.');
  }
}

/** Subscribe to real-time report updates. Returns an unsubscribe function. */
export function subscribeToReports(
  callback: (reports: Report[]) => void,
  filters?: ReportFilters
): Unsubscribe {
  if (!isFirebaseConfigured() || !db) {
    // In demo mode, just call callback once with demo data
    getReports(filters).then(callback);
    return () => {};
  }

  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.riskLevel) {
    constraints.push(where('riskLevel', '==', filters.riskLevel));
  }

  const q = query(collection(db, 'reports'), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let reports = snapshot.docs.map((d) => docToReport(d.id, d.data()));
    if (filters?.status) reports = reports.filter((report) => report.status === filters.status);
    if (filters?.search) {
      reports = filterReports(reports, { search: filters.search });
    }
    callback(reports);
  });
}

/** Get demo reports (for testing and non-configured environments). */
export function getDemoReports(): Report[] {
  return [...DEMO_REPORTS];
}

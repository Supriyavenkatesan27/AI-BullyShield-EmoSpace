// ============================================================
// AI BullyShield API — Firebase Admin Service
// ============================================================

import admin from 'firebase-admin';
import type {
  IncidentReport,
  CounselorNote,
  ReportStatus,
  ApiResponse,
} from '@bullyshield/shared';
import { config } from '../config.js';
import { readFileSync } from 'fs';

/** Whether Firebase Admin has been initialized */
let initialized = false;

/** Initialize Firebase Admin SDK */
function initializeFirebase(): boolean {
  if (initialized) return true;

  if (!config.firebaseEnabled) {
    console.warn(
      '[Firebase] Not configured — set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH'
    );
    return false;
  }

  try {
    const initOptions: admin.AppOptions = {};

    if (config.firebaseServiceAccountPath) {
      // Load service account from file
      const serviceAccountRaw = readFileSync(
        config.firebaseServiceAccountPath,
        'utf-8'
      );
      const serviceAccount = JSON.parse(serviceAccountRaw);
      initOptions.credential = admin.credential.cert(serviceAccount);
    } else if (config.firebaseProjectId) {
      // Use default credentials (Cloud Run, GCE, etc.) or ADC
      initOptions.credential = admin.credential.applicationDefault();
      initOptions.projectId = config.firebaseProjectId;
    }

    admin.initializeApp(initOptions);
    initialized = true;
    console.log('[Firebase] Admin SDK initialized successfully');
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Firebase] Failed to initialize:', msg);
    return false;
  }
}

/** Get Firestore database reference */
function getDb(): admin.firestore.Firestore | null {
  if (!initializeFirebase()) return null;
  return admin.firestore();
}

/** Get Firebase Auth instance */
export function getAuth(): admin.auth.Auth | null {
  if (!initializeFirebase()) return null;
  return admin.auth();
}

/** Reports collection name */
const REPORTS_COLLECTION = 'reports';

/**
 * Create a new incident report in Firestore.
 */
export async function createReport(
  report: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string; report: IncidentReport }> {
  const db = getDb();
  if (!db) {
    throw new Error(
      'Firebase is not configured. Cannot save reports. Please configure FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH.'
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const docData = {
    ...report,
    counselorNotes: report.counselorNotes || [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection(REPORTS_COLLECTION).add(docData);

  return {
    id: docRef.id,
    report: {
      ...report,
      id: docRef.id,
      counselorNotes: report.counselorNotes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/** Query filter options for listing reports */
export interface ReportQueryOptions {
  status?: string;
  riskLevel?: string;
  category?: string;
  limit?: number;
}

/**
 * Get a list of reports from Firestore, with optional filters.
 */
export async function getReports(
  options: ReportQueryOptions = {}
): Promise<IncidentReport[]> {
  const db = getDb();
  if (!db) {
    throw new Error(
      'Firebase is not configured. Cannot retrieve reports.'
    );
  }

  let query: admin.firestore.Query = db.collection(REPORTS_COLLECTION);

  if (options.status) {
    query = query.where('status', '==', options.status);
  }
  if (options.riskLevel) {
    query = query.where('riskLevel', '==', options.riskLevel);
  }
  if (options.category) {
    query = query.where('category', '==', options.category);
  }

  query = query.orderBy('createdAt', 'desc');
  query = query.limit(options.limit || 50);

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as IncidentReport[];
}

/**
 * Get a single report by ID.
 */
export async function getReportById(
  reportId: string
): Promise<IncidentReport | null> {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Cannot retrieve report.');
  }

  const doc = await db.collection(REPORTS_COLLECTION).doc(reportId).get();
  if (!doc.exists) return null;

  return {
    id: doc.id,
    ...doc.data(),
  } as IncidentReport;
}

/**
 * Update a report (status, assigned counselor, resolution).
 */
export async function updateReport(
  reportId: string,
  updates: {
    status?: ReportStatus;
    assignedCounselor?: string;
    resolution?: string;
  }
): Promise<IncidentReport | null> {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Cannot update report.');
  }

  const docRef = db.collection(REPORTS_COLLECTION).doc(reportId);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.update(updateData);

  // Return updated document
  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data(),
  } as IncidentReport;
}

/**
 * Add a counselor note to a report.
 */
export async function addCounselorNote(
  reportId: string,
  note: CounselorNote
): Promise<IncidentReport | null> {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Cannot add note.');
  }

  const docRef = db.collection(REPORTS_COLLECTION).doc(reportId);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.update({
    counselorNotes: admin.firestore.FieldValue.arrayUnion(note),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Return updated document
  const updated = await docRef.get();
  return {
    id: updated.id,
    ...updated.data(),
  } as IncidentReport;
}

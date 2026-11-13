// ============================================================
// AI BullyShield API — Authentication Middleware
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse, UserRole } from '@bullyshield/shared';
import { config } from '../config.js';
import { getAuth } from '../services/firebase.js';

/** Extended request with authenticated user info */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: UserRole;
  };
}

/**
 * Middleware that verifies a Firebase ID token from the Authorization header
 * and checks for counselor or admin role in custom claims.
 *
 * If Firebase is not configured, logs a warning and allows the request through
 * in development mode (for testing), or rejects in production.
 */
export async function requireCounselor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // If Firebase is not configured, handle gracefully
  if (!config.firebaseEnabled) {
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      console.warn(
        '[Auth] Firebase not configured — skipping auth check in development mode'
      );
      req.user = {
        uid: 'dev-counselor',
        email: 'dev@bullyshield.local',
        role: 'counselor' as UserRole,
      };
      next();
      return;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: 'Authentication service not configured',
      message:
        'Firebase is not configured. Please contact the administrator.',
    };
    res.status(503).json(response);
    return;
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    };
    res.status(401).json(response);
    return;
  }

  const idToken = authHeader.substring(7);

  try {
    const auth = getAuth();
    if (!auth) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authentication service unavailable',
      };
      res.status(503).json(response);
      return;
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    // Check custom claims for counselor or admin role
    const role = (decodedToken.role as UserRole) || 'user';
    if (role !== 'counselor' && role !== 'admin') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Forbidden',
        message: 'You do not have counselor permissions to access this resource.',
      };
      res.status(403).json(response);
      return;
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    };

    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token verification failed';
    console.error('[Auth] Token verification error:', message);

    const response: ApiResponse<null> = {
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token.',
    };
    res.status(401).json(response);
  }
}

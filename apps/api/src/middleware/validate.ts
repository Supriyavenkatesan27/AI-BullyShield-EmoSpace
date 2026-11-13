// ============================================================
// AI BullyShield API — Validation Middleware
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import type { ApiResponse } from '@bullyshield/shared';

/**
 * Creates Express middleware that validates req.body against a Zod schema.
 * On success, replaces req.body with the parsed (cleaned) data.
 * On failure, returns a 400 with structured error details.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: errors.map((e) => `${e.field}: ${e.message}`).join('; '),
      };

      res.status(400).json(response);
      return;
    }

    // Replace body with parsed data (includes defaults, transforms, etc.)
    req.body = result.data;
    next();
  };
}

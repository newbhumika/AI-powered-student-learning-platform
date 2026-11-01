import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.ts';
import { store } from './db.ts';

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * Sliding-window rate limiter protecting server-side AI endpoints from abuse.
 */
export function aiRateLimiter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const configuredLimit = parseInt(
    store.getSetting('ai_rate_limit_per_minute', '20'),
    10
  );
  const maxRequests = Number.isFinite(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 20;

  const windowMs = 60 * 1000;
  const now = Date.now();
  const identifier = req.authUser?.id || req.ip || 'anonymous';

  const bucket = buckets.get(identifier) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    res.status(429).json({
      error: `Rate limit reached (${maxRequests} AI requests/minute). Please wait ${retryAfterSec}s before trying again.`,
    });
    return;
  }

  bucket.timestamps.push(now);
  buckets.set(identifier, bucket);
  next();
}

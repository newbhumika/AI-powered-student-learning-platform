import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { store, generateId, type StoredProfile } from './db.ts';
import type { UserRole } from '../shared/types.ts';

const SECRET_FILE = path.resolve(process.cwd(), 'data', '.auth_secret');

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16) {
    return process.env.AUTH_SECRET;
  }
  try {
    const dir = path.dirname(SECRET_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
    return generated;
  } catch {
    return 'fallback-runtime-secret-student-learning-assistant-2026';
  }
}

const AUTH_SECRET = getAuthSecret();
const revokedTokens = new Set<string>();

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (derivedBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(derivedBuffer, keyBuffer);
}

interface TokenPayload {
  sub: string;
  role: UserRole;
  exp: number;
  jti: string;
}

export function createSessionToken(userId: string, role: UserRole): string {
  const payload: TokenPayload = {
    sub: userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as TokenPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string): void {
  revokedTokens.add(token);
}

/**
 * Synchronizes environment-configured Admin account if ADMIN_EMAIL & ADMIN_PASSWORD are provided.
 */
export function syncEnvironmentAdmin(): void {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword || adminPassword === 'ChangeMeStrongPassword123!') {
    return;
  }

  const existing = store.tables.profiles.find(
    (p) => p.email.toLowerCase() === adminEmail
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = hashPassword(adminPassword);
    existing.isActive = true;
    existing.updatedAt = now;
  } else {
    const adminProfile: StoredProfile = {
      id: generateId(),
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      fullName: 'Platform Administrator',
      avatarUrl: '',
      academicLevel: 'Faculty / Administration',
      preferredSubjects: [],
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    store.tables.profiles.push(adminProfile);
  }
  store.commit();
}

export function isProductionAdminLocked(): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  return Boolean(
    adminEmail &&
      adminPassword &&
      adminPassword !== 'ChangeMeStrongPassword123!'
  );
}

export function hasConfiguredAdmin(): boolean {
  syncEnvironmentAdmin();
  return store.tables.profiles.some((p) => p.role === 'admin' && p.isActive);
}

/**
 * Ensures a ready-to-use NoSQL sandbox Student or Admin profile exists in data/database.json
 * when requested via the server-side academic demonstration endpoint (without exposing credentials in client code).
 */
export function getOrCreateSandboxProfile(role: UserRole): StoredProfile {
  const now = new Date().toISOString();

  if (role === 'admin') {
    const existingAdmin = store.tables.profiles.find(
      (p) => p.role === 'admin' && p.isActive
    );
    if (existingAdmin) {
      return existingAdmin;
    }

    const adminProfile: StoredProfile = {
      id: generateId(),
      email: 'admin@edunexus.edu',
      passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
      fullName: 'Dr. Rajesh Verma',
      avatarUrl: '',
      academicLevel: 'Faculty / Administration',
      preferredSubjects: [],
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    store.tables.profiles.push(adminProfile);
    store.commit();
    return adminProfile;
  }

  const sandboxStudentEmail = 'aarav.sharma@university.edu';
  const existingStudent = store.tables.profiles.find(
    (p) => p.email.toLowerCase() === sandboxStudentEmail && p.role === 'student'
  );
  if (existingStudent) {
    if (!existingStudent.isActive) {
      existingStudent.isActive = true;
      existingStudent.updatedAt = now;
      store.commit();
    }
    return existingStudent;
  }

  const studentProfile: StoredProfile = {
    id: generateId(),
    email: sandboxStudentEmail,
    passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
    fullName: 'Aarav Sharma',
    avatarUrl: '',
    academicLevel: 'B.Tech CSE - 5th Semester',
    preferredSubjects: [
      'Data Structures & Algorithms',
      'Operating Systems',
      'Database Management Systems',
    ],
    role: 'student',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  store.tables.profiles.push(studentProfile);
  store.commit();
  return studentProfile;
}

export interface AuthenticatedRequest extends Request {
  authUser?: StoredProfile;
  rawToken?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = store.tables.profiles.find((p) => p.id === payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({
      error: 'Your account has been deactivated by an administrator.',
    });
    return;
  }

  req.authUser = user;
  req.rawToken = token;
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden: Administrator privileges are required to access this resource.',
      });
      return;
    }
    next();
  });
}

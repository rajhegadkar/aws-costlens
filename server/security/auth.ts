import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

const DEFAULT_USER = 'admin';
const DEFAULT_PASSWORD = 'admin123';
const SECRET_KEY = process.env.JWT_SECRET || 'aws-costlens-secure-local-session-2026';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_REVOKED_TOKENS = 5000;

// Map of active tokens: token -> { username, expiresAt }
const activeSessions = new Map<string, { username: string; expiresAt: number }>();
const revokedTokens = new Set<string>();

function pruneSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }
  if (revokedTokens.size > MAX_REVOKED_TOKENS) {
    const excess = revokedTokens.size - MAX_REVOKED_TOKENS;
    let i = 0;
    for (const t of revokedTokens) {
      if (i++ >= excess) break;
      revokedTokens.delete(t);
    }
  }
}

function safeStringCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf-8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf-8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function isUsingDefaultCredentials(): boolean {
  const configuredUser = (process.env.APP_ADMIN_USER || process.env.APP_USERNAME || DEFAULT_USER).trim();
  const configuredPass = (process.env.APP_ADMIN_PASSWORD || process.env.APP_PASSWORD || DEFAULT_PASSWORD).trim();
  return configuredUser === DEFAULT_USER && configuredPass === DEFAULT_PASSWORD;
}

export function generateToken(username: string): string {
  pruneSessions();
  const cleanUser = Buffer.from(username, 'utf-8').toString('base64url');
  const payload = `${cleanUser}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  activeSessions.set(token, { username, expiresAt });
  revokedTokens.delete(token);
  return token;
}

export function verifyToken(token: string): { valid: boolean; username?: string } {
  if (!token || typeof token !== 'string' || revokedTokens.has(token)) {
    return { valid: false };
  }

  // Check in-memory active session first
  const session = activeSessions.get(token);
  if (session) {
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return { valid: false };
    }
    return { valid: true, username: session.username };
  }

  // Stateless HMAC signature verification fallback
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 4) return { valid: false };

    const [encodedUser, timestamp, salt, signature] = parts;
    const payload = `${encodedUser}:${timestamp}:${salt}`;
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    const sigBuf = Buffer.from(signature, 'utf-8');
    const expectedBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expectedBuf.length) {
      return { valid: false };
    }

    if (crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      const ts = parseInt(timestamp, 10);
      if (Number.isNaN(ts)) return { valid: false };
      const age = Date.now() - ts;
      if (age >= 0 && age < SESSION_DURATION_MS) {
        let username = encodedUser;
        try {
          const decoded = Buffer.from(encodedUser, 'base64url').toString('utf-8');
          if (decoded && /^[\x20-\x7E]+$/.test(decoded)) {
            username = decoded;
          }
        } catch {
          // Keep original if legacy format
        }
        return { valid: true, username };
      }
    }
  } catch {
    return { valid: false };
  }

  return { valid: false };
}

export function authenticateUser(
  username: string,
  password: string
): { success: boolean; token?: string; error?: string } {
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return { success: false, error: 'Username and password are required' };
  }

  const expectedUser = (process.env.APP_ADMIN_USER || process.env.APP_USERNAME || DEFAULT_USER).trim();
  const expectedPassword = (process.env.APP_ADMIN_PASSWORD || process.env.APP_PASSWORD || DEFAULT_PASSWORD).trim();

  const userMatch = safeStringCompare(username.trim(), expectedUser);
  const passMatch = safeStringCompare(password.trim(), expectedPassword);

  if (userMatch && passMatch) {
    const token = generateToken(expectedUser);
    return { success: true, token };
  }

  return { success: false, error: 'Invalid username or password' };
}

export function invalidateToken(token: string) {
  if (!token) return;
  activeSessions.delete(token);
  revokedTokens.add(token);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const publicPaths = [
    '/health',
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/logout',
    '/api/auth/status',
    '/api/security/audit'
  ];
  if (!req.path.startsWith('/api') || publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const result = verifyToken(token);
  if (!result.valid) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }

  (req as any).user = result.username;
  next();
}

import { describe, it, expect } from 'vitest';
import {
  authenticateUser,
  generateToken,
  verifyToken,
  invalidateToken,
  authMiddleware
} from '../server/security/auth.js';

describe('Local Authentication & Session Security', () => {
  it('authenticates with default credentials successfully', () => {
    const res = authenticateUser('admin', 'admin123');
    expect(res.success).toBe(true);
    expect(res.token).toBeDefined();

    if (res.token) {
      const verify = verifyToken(res.token);
      expect(verify.valid).toBe(true);
      expect(verify.username).toBe('admin');
    }
  });

  it('rejects incorrect username or password', () => {
    const res1 = authenticateUser('admin', 'wrongpassword');
    expect(res1.success).toBe(false);
    expect(res1.token).toBeUndefined();

    const res2 = authenticateUser('wronguser', 'admin123');
    expect(res2.success).toBe(false);
  });

  it('correctly invalidates active tokens upon logout', () => {
    const token = generateToken('admin');
    expect(verifyToken(token).valid).toBe(true);

    invalidateToken(token);
    expect(verifyToken(token).valid).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('').valid).toBe(false);
    expect(verifyToken('garbage-token-string').valid).toBe(false);
  });

  it('authMiddleware accepts token via Authorization Bearer header', () => {
    const token = generateToken('admin');
    let nextCalled = false;
    const req: any = {
      path: '/api/cost/departments/export',
      headers: { authorization: `Bearer ${token}` },
      query: {}
    };
    const res: any = {
      status: () => res,
      json: () => res
    };
    const next = () => { nextCalled = true; };

    authMiddleware(req, res, next);
    expect(nextCalled).toBe(true);
    expect(req.user).toBe('admin');
  });

  it('authMiddleware accepts token via query parameter ?token=...', () => {
    const token = generateToken('admin');
    let nextCalled = false;
    const req: any = {
      path: '/api/cost/departments/export',
      headers: {},
      query: { token }
    };
    const res: any = {
      status: () => res,
      json: () => res
    };
    const next = () => { nextCalled = true; };

    authMiddleware(req, res, next);
    expect(nextCalled).toBe(true);
    expect(req.user).toBe('admin');
  });

  it('authMiddleware returns 401 when no token is provided for protected endpoints', () => {
    let nextCalled = false;
    let statusCode = 0;
    let responseBody: any = null;

    const req: any = {
      path: '/api/cost/departments/export',
      headers: {},
      query: {}
    };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        responseBody = body;
        return res;
      }
    };
    const next = () => { nextCalled = true; };

    authMiddleware(req, res, next);
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
    expect(responseBody?.error).toContain('Authentication required');
  });
});

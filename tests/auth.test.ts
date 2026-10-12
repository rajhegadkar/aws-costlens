import { describe, it, expect } from 'vitest';
import {
  authenticateUser,
  generateToken,
  verifyToken,
  invalidateToken
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
});

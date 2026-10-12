import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  explainService,
  explainUsageType,
  getFriendlyRegionName
} from '../shared/explanationDictionary.js';
import { FileCache } from '../server/cache/fileCache.js';
import {
  authenticateUser,
  generateToken,
  verifyToken,
  invalidateToken
} from '../server/security/auth.js';
import { createRateLimiter } from '../server/security/rateLimiter.js';
import {
  CostExplorerService,
  getAvailableMonths,
  setDemoMode
} from '../server/aws/costExplorerService.js';
import { InventoryService } from '../server/aws/inventoryService.js';

describe('Explanation Dictionary & Smart Categorization', () => {
  it('accurately categorizes AI & ML services including Bedrock and Claude models', () => {
    expect(explainService('Amazon Bedrock').category).toBe('AI & ML');
    expect(explainService('Claude Sonnet 5 (Amazon Bedrock Edition)').category).toBe('AI & ML');
    expect(explainService('Claude Sonnet 4.6 (Amazon Bedrock Edition)').category).toBe('AI & ML');
    expect(explainService('Claude Haiku 4.5 (Amazon Bedrock Edition)').category).toBe('AI & ML');
    expect(explainService('Custom Anthropic Model Inference').category).toBe('AI & ML');
  });

  it('categorizes Compute, Networking, Storage, and Database services accurately', () => {
    expect(explainService('Amazon Lightsail').category).toBe('Compute');
    expect(explainService('Amazon Route 53').category).toBe('Networking');
    expect(explainService('Amazon CloudFront').category).toBe('Networking');
    expect(explainService('Amazon Simple Storage Service').category).toBe('Storage');
    expect(explainService('Amazon Relational Database Service').category).toBe('Database');
    expect(explainService('Tax').category).toBe('Other');
  });

  it('explains usage types and AWS regions in plain English', () => {
    expect(explainUsageType('APS3-BoxUsage:t3.medium').simpleExplanation).toContain('virtual servers');
    expect(explainUsageType('APS3-VolumeUsage.gp3').simpleExplanation).toContain('SSD');
    expect(explainUsageType('APS3-MP:InputTokenCount-Units').friendlyTitle).toContain('Token');
    expect(getFriendlyRegionName('ap-south-1')).toContain('Mumbai');
    expect(getFriendlyRegionName('us-west-2')).toContain('Oregon');
  });
});

describe('Non-Destructive FileCache & Stale Fallback', () => {
  let tempCacheDir: string;

  beforeEach(() => {
    tempCacheDir = path.join(os.tmpdir(), `costlens-test-cache-${Date.now()}`);
  });

  afterEach(() => {
    if (fs.existsSync(tempCacheDir)) {
      fs.rmSync(tempCacheDir, { recursive: true, force: true });
    }
  });

  it('preserves expired entries for getStale() offline resilience instead of deleting them on get()', async () => {
    const cache = new FileCache(tempCacheDir, 20);
    cache.set('overview:2026-09', { spend: 1290.75 });
    cache.flushSync();

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 30));

    // Fresh get() returns null when expired
    expect(cache.get('overview:2026-09', 15)).toBeNull();

    // Stale getStale() still recovers the cached data when offline!
    expect(cache.getStale<{ spend: number }>('overview:2026-09')).toEqual({ spend: 1290.75 });

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.staleHits).toBe(1);
  });
});

describe('Authentication & Session Security', () => {
  it('supports usernames containing special characters or colons via base64url encoding', () => {
    const token = generateToken('org:admin@example.com');
    const verified = verifyToken(token);
    expect(verified.valid).toBe(true);
    expect(verified.username).toBe('org:admin@example.com');

    invalidateToken(token);
    expect(verifyToken(token).valid).toBe(false);
  });

  it('authenticates valid credentials and rejects invalid credentials', () => {
    const fail = authenticateUser('admin', 'wrong-password');
    expect(fail.success).toBe(false);

    const expectedUser = process.env.APP_ADMIN_USER || process.env.APP_USERNAME || 'admin';
    const expectedPass = process.env.APP_ADMIN_PASSWORD || process.env.APP_PASSWORD || 'admin123';
    const ok = authenticateUser(expectedUser, expectedPass);
    expect(ok.success).toBe(true);
    expect(ok.token).toBeTruthy();
  });
});

describe('Sliding-Window Rate Limiter', () => {
  it('blocks requests once maxRequests is exceeded within the window', () => {
    const limiter = createRateLimiter({
      name: `test-limiter-${Date.now()}`,
      windowMs: 60_000,
      maxRequests: 2,
      message: 'Rate limit exceeded'
    });

    const createMockReqRes = () => {
      const headers: Record<string, string> = {};
      let statusCode = 200;
      let jsonBody: any = null;
      let nextCalled = false;

      const req: any = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };
      const res: any = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
        },
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (body: any) => {
          jsonBody = body;
          return res;
        }
      };
      const next = () => {
        nextCalled = true;
      };

      return { req, res, next, getResult: () => ({ statusCode, jsonBody, nextCalled, headers }) };
    };

    const call1 = createMockReqRes();
    limiter(call1.req, call1.res, call1.next);
    expect(call1.getResult().nextCalled).toBe(true);

    const call2 = createMockReqRes();
    limiter(call2.req, call2.res, call2.next);
    expect(call2.getResult().nextCalled).toBe(true);

    const call3 = createMockReqRes();
    limiter(call3.req, call3.res, call3.next);
    expect(call3.getResult().nextCalled).toBe(false);
    expect(call3.getResult().statusCode).toBe(429);
    expect(call3.getResult().jsonBody.error).toBe('Rate limit exceeded');
  });
});

describe('CostExplorerService & Category Deep-Dives', () => {
  beforeEach(() => {
    setDemoMode(true);
  });

  afterEach(() => {
    setDemoMode(false);
  });

  it('returns 12 valid YYYY-MM months in getAvailableMonths()', () => {
    const months = getAvailableMonths();
    expect(months).toHaveLength(12);
    expect(months[0].isCurrent).toBe(true);
    for (const m of months) {
      expect(m.value).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
  });

  it('supports AI & ML category deep-dive and async natural language search', async () => {
    const aiDeepDive = await CostExplorerService.getCategoryDeepDive('AI & ML', '2026-09');
    expect(aiDeepDive.category).toBe('AI & ML');
    expect(aiDeepDive.recommendations.length).toBeGreaterThan(0);

    const searchRes = await CostExplorerService.handleSearch('Why did my bill increase?', '2026-09');
    expect(searchRes.title).toBeTruthy();
    expect(searchRes.summary).toContain('$');
    expect(searchRes.suggestedAction?.page).toBe('anomalies');
  });

  it('populates per-EC2-instance and per-S3-bucket current billing and run-rates in InventoryService', async () => {
    const demoInv = await InventoryService.getInventory(false, '2026-10');
    expect(demoInv.ec2Instances.length).toBeGreaterThan(0);
    expect(demoInv.s3Buckets.length).toBeGreaterThan(0);
    for (const inst of demoInv.ec2Instances) {
      expect(typeof inst.currentMonthCost).toBe('number');
      expect(typeof inst.estimatedMonthlyCost).toBe('number');
      expect(typeof inst.hourlyRate).toBe('number');
      expect(inst.costBreakdown).toBeTruthy();
    }
    for (const bucket of demoInv.s3Buckets) {
      expect(typeof bucket.currentMonthCost).toBe('number');
      expect(typeof bucket.estimatedMonthlyCost).toBe('number');
      expect(typeof bucket.percentOfS3Total).toBe('number');
      expect(typeof bucket.estimatedSizeGb).toBe('number');
      expect(bucket.storageClass).toBeTruthy();
    }
  });
});


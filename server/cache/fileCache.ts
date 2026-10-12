import fs from 'node:fs';
import path from 'node:path';

interface CacheEntry<T> {
  key: string;
  timestamp: number;
  data: T;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  staleHits: number;
  lastRefreshed: string;
  cacheFilePath: string;
}

export class FileCache {
  private cacheFilePath: string;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs: number;
  private lastRefreshedTimestamp: number = Date.now();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private isWriting: boolean = false;
  private pendingWrite: boolean = false;
  private hits: number = 0;
  private misses: number = 0;
  private staleHits: number = 0;

  constructor(cacheDirectory: string = './data', defaultTtlMs: number = 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
    const resolvedDir = path.resolve(process.cwd(), cacheDirectory);
    if (!fs.existsSync(resolvedDir)) {
      try {
        fs.mkdirSync(resolvedDir, { recursive: true });
      } catch {
        console.warn('[CACHE] Could not create cache directory on disk, using in-memory cache only.');
      }
    }
    this.cacheFilePath = path.join(resolvedDir, 'cost-explorer-cache.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          let latestTs = 0;
          for (const [k, v] of Object.entries(parsed)) {
            const entry = v as CacheEntry<any>;
            if (entry && typeof entry === 'object' && 'data' in entry) {
              this.memoryCache.set(k, entry);
              if (typeof entry.timestamp === 'number' && entry.timestamp > latestTs && entry.timestamp <= Date.now()) {
                latestTs = entry.timestamp;
              }
            }
          }
          if (latestTs > 0) {
            this.lastRefreshedTimestamp = latestTs;
          }
          console.log(`[CACHE] Loaded ${this.memoryCache.size} cached items from disk.`);
        }
      }
    } catch (err) {
      console.warn('[CACHE] Error loading cache file from disk, starting empty:', err);
    }
  }

  private scheduleSaveToDisk() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.writeToDiskAsync();
    }, 100);
  }

  private async writeToDiskAsync(): Promise<void> {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }
    this.isWriting = true;
    try {
      const obj: Record<string, any> = {};
      for (const [k, v] of this.memoryCache.entries()) {
        obj[k] = v;
      }
      const serialized = JSON.stringify(obj, null, 2);
      const tmpPath = `${this.cacheFilePath}.tmp`;
      await fs.promises.writeFile(tmpPath, serialized, 'utf-8');
      await fs.promises.rename(tmpPath, this.cacheFilePath);
    } catch (err) {
      // Fallback to direct write if rename across devices or permissions fails
      try {
        const obj: Record<string, any> = {};
        for (const [k, v] of this.memoryCache.entries()) {
          obj[k] = v;
        }
        await fs.promises.writeFile(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
      } catch (innerErr) {
        console.warn('[CACHE] Failed to save cache to disk:', innerErr);
      }
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        void this.writeToDiskAsync();
      }
    }
  }

  /**
   * Synchronously flushes any pending in-memory cache changes to disk (used during graceful shutdown).
   */
  public flushSync() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      const obj: Record<string, any> = {};
      for (const [k, v] of this.memoryCache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[CACHE] Failed synchronous cache flush:', err);
    }
  }

  /**
   * Retrieves a fresh cache entry within the specified TTL.
   * Does NOT delete expired entries from disk so getStale() can serve as an offline/error fallback.
   */
  public get<T>(key: string, ttlMs: number = this.defaultTtlMs): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > ttlMs) {
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Retrieves the last known good cached value even if its TTL has expired.
   * Essential for high availability when AWS APIs are unreachable or rate-limited.
   */
  public getStale<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    this.staleHits++;
    return entry.data as T;
  }

  public set<T>(key: string, data: T) {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      timestamp: now,
      data
    };
    this.memoryCache.set(key, entry);
    this.lastRefreshedTimestamp = now;
    this.scheduleSaveToDisk();
  }

  public invalidate(keyPrefix?: string) {
    if (!keyPrefix) {
      this.memoryCache.clear();
    } else {
      for (const k of Array.from(this.memoryCache.keys())) {
        if (k.startsWith(keyPrefix)) {
          this.memoryCache.delete(k);
        }
      }
    }
    this.lastRefreshedTimestamp = Date.now();
    this.scheduleSaveToDisk();
    console.log(`[CACHE] Cache invalidated (prefix: ${keyPrefix || 'ALL'}).`);
  }

  public getLastUpdated(): string {
    return new Date(this.lastRefreshedTimestamp).toISOString();
  }

  public getStats(): CacheStats {
    return {
      totalEntries: this.memoryCache.size,
      hits: this.hits,
      misses: this.misses,
      staleHits: this.staleHits,
      lastRefreshed: this.getLastUpdated(),
      cacheFilePath: this.cacheFilePath
    };
  }
}

export const globalCache = new FileCache(
  './data',
  Number(process.env.CACHE_TTL_MS) || 60 * 60 * 1000 // 1 hour default
);

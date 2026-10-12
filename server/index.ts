import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { apiRouter } from './routes/api.js';
import { authMiddleware, isUsingDefaultCredentials } from './security/auth.js';
import { apiRateLimiter } from './security/rateLimiter.js';
import { globalCache } from './cache/fileCache.js';

export const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.disable('x-powered-by');

// Security headers middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true
  })
);
app.use(express.json({ limit: '100kb' }));

// Health check endpoint (unauthenticated for container orchestrators)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    mode: 'READ_ONLY',
    uptimeSeconds: Math.round(process.uptime()),
    cache: globalCache.getStats(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRateLimiter);
app.use(authMiddleware);

// API Routes
app.use('/api', apiRouter);

// Catch-all 404 for unknown API endpoints
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Production: serve static frontend build if index.html exists
const staticDistPath = path.resolve(process.cwd(), 'dist');
const indexHtmlPath = path.join(staticDistPath, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  // Block access to compiled backend files in dist/server
  app.use('/server', (_req: Request, res: Response) => {
    res.status(404).end();
  });
  app.use(express.static(staticDistPath, { index: false }));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(indexHtmlPath);
  });
}

// Global Express error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err?.message || err);
  res.status(err?.status || 500).json({
    error: err?.message || 'Internal Server Error'
  });
});

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(Number(PORT), HOST, () => {
    const lanIps = getLocalIpAddresses();
    console.log('=====================================================');
    console.log(`🔒 AWS COST EXPLORER (READ-ONLY) SERVER STARTED`);
    console.log(`📡 Local URL:   http://localhost:${PORT}`);
    if (lanIps.length > 0) {
      lanIps.forEach(ip => {
        console.log(`🌐 Network LAN: http://${ip}:${PORT}`);
      });
    } else {
      console.log(`🌐 Network LAN: http://${HOST}:${PORT}`);
    }
    console.log(`🛡️  Read-Only Safety Guard: ENFORCED`);
    if (isUsingDefaultCredentials()) {
      console.log(`⚠️  Auth: Using default credentials (set APP_USERNAME / APP_PASSWORD in .env for production)`);
    } else {
      console.log(`🔑 Auth: Custom credentials loaded from environment`);
    }
    console.log('=====================================================');
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\n[${signal}] Flushing cache and shutting down gracefully...`);
    globalCache.flushSync();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}


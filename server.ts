import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import {
  MAX_RESUME_BYTES,
  parseAndAnalyzeResume,
  ResumeParseError,
} from './server/resumeParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const envPort = Number(process.env.PORT);
const nginxPort = Number(process.env.NGINX_PORT);
const PORT =
  envPort && (!nginxPort || envPort !== nginxPort)
    ? envPort
    : Number(process.env.DEFAULT_APP_PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '2mb' }));

// Ensure /api routes cleanly handle CORS & preflight requests in embedded preview or cross-origin setups
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    runtime: 'express',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/resume/parse', (req, res) => {
  upload.single('resume')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError) {
        if (uploadErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            code: 'FILE_TOO_LARGE',
            error: 'File exceeds the 15 MB size limit. Please upload a smaller resume file.',
          });
        }
        return res.status(400).json({
          code: 'UNSUPPORTED_FILE',
          error: `Upload rejected (${uploadErr.code}): ${uploadErr.message}`,
        });
      }
      const message = uploadErr instanceof Error ? uploadErr.message : 'Multipart upload failed.';
      console.error('[resume-parse] Multipart upload error:', message);
      return res.status(400).json({
        code: 'NO_FILE',
        error: message,
      });
    }

    try {
      const result = await parseAndAnalyzeResume(
        req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
              buffer: req.file.buffer,
            }
          : undefined
      );
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof ResumeParseError) {
        console.warn(`[resume-parse] Rejected (${err.status} ${err.code}): ${err.message}`);
        return res.status(err.status).json({
          code: err.code,
          error: err.message,
        });
      }
      const msg = err instanceof Error ? err.message : 'Unexpected server error during resume analysis.';
      console.error('[resume-parse] Unexpected failure:', err);
      return res.status(500).json({
        code: 'SERVER_ERROR',
        error: msg,
      });
    }
  });
});

// Catch unknown /api routes with JSON instead of Vite/SPA HTML fallback
app.use('/api', (_req, res) => {
  res.status(404).json({
    code: 'SERVER_ERROR',
    error: 'API endpoint not found.',
  });
});

// Global JSON error middleware for /api so Express never returns an HTML error page
app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal API error.';
  console.error('[api] Unhandled middleware error:', err);
  if (res.headersSent) return;
  res.status(500).json({
    code: 'SERVER_ERROR',
    error: message,
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', async (_req, res) => {
      const indexHtml = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8').send(indexHtml);
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`SkillBridge AI portal running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SkillBridge AI server:', err);
  process.exit(1);
});

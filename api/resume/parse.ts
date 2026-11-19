import type { IncomingMessage, ServerResponse } from 'node:http';
import multer from 'multer';
import {
  MAX_RESUME_BYTES,
  parseAndAnalyzeResume,
  ResumeParseError,
} from '../../server/resumeParser.ts';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
});

interface MultipartRequest extends IncomingMessage {
  file?: Express.Multer.File;
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default function handler(req: MultipartRequest, res: ServerResponse) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, {
      code: 'SERVER_ERROR',
      error: 'Method not allowed. Use POST multipart/form-data to parse a resume.',
    });
  }

  const singleUpload = upload.single('resume') as unknown as (
    rq: IncomingMessage,
    rs: ServerResponse,
    cb: (err?: unknown) => void
  ) => void;

  singleUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        return sendJson(res, 413, {
          code: 'FILE_TOO_LARGE',
          error: 'File exceeds the 15 MB size limit. Please upload a smaller resume file.',
        });
      }
      const message =
        uploadErr instanceof Error ? uploadErr.message : 'Multipart upload failed.';
      return sendJson(res, 400, {
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
      return sendJson(res, 200, result);
    } catch (err) {
      if (err instanceof ResumeParseError) {
        return sendJson(res, err.status, {
          code: err.code,
          error: err.message,
        });
      }
      const msg =
        err instanceof Error ? err.message : 'Unexpected server error during resume analysis.';
      return sendJson(res, 500, {
        code: 'SERVER_ERROR',
        error: msg,
      });
    }
  });
}

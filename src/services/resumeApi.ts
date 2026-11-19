import type { ExtractedResumeReviewData } from '../types/skillbridge';

export type ResumeUploadErrorKind =
  | 'backend_unavailable'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unsupported_file'
  | 'empty_document'
  | 'file_too_large'
  | 'auth_required'
  | 'server_error';

export class ResumeUploadError extends Error {
  readonly kind: ResumeUploadErrorKind;
  readonly status?: number;

  constructor(kind: ResumeUploadErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ResumeUploadError';
    this.kind = kind;
    this.status = status;
  }
}

export interface ApiHealthStatus {
  ok: boolean;
  geminiConfigured: boolean;
  runtime?: string;
}

export type BackendProbeResult =
  | { status: 'ok'; health: ApiHealthStatus }
  | { status: 'auth_required' }
  | { status: 'unreachable' };

const REQUEST_TIMEOUT_MS = 45000;
const AUTH_URL_OR_HTML_RE =
  /__cookie_check\.html|applet-auth-bridge|accounts\.google\.com|action required to load your app|__aistudio_auth_token/i;

function getApiBaseUrl(): string {
  const configured = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL;
  if (!configured || !configured.trim()) return '';
  return configured.trim().replace(/\/+$/, '');
}

function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}

function isAuthInterceptionResponse(res: Response): boolean {
  if (
    res.type === 'opaqueredirect' ||
    res.redirected ||
    (res.status >= 300 && res.status < 400) ||
    res.status === 401 ||
    res.status === 403
  ) {
    return true;
  }
  if (typeof res.url === 'string' && AUTH_URL_OR_HTML_RE.test(res.url)) {
    return true;
  }
  return false;
}

export async function probeBackendStatus(timeoutMs = 4000): Promise<BackendProbeResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(buildApiUrl('/api/health'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
    if (isAuthInterceptionResponse(res)) {
      return { status: 'auth_required' };
    }
    if (!res.ok) return { status: 'unreachable' };
    const raw = await res.text();
    if (AUTH_URL_OR_HTML_RE.test(raw)) {
      return { status: 'auth_required' };
    }
    const parsed = tryParseJson(raw);
    if (!parsed || parsed.ok !== true) return { status: 'unreachable' };
    return { status: 'ok', health: parsed as unknown as ApiHealthStatus };
  } catch {
    return { status: 'unreachable' };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkBackendHealth(timeoutMs = 4000): Promise<ApiHealthStatus | null> {
  const result = await probeBackendStatus(timeoutMs);
  return result.status === 'ok' ? result.health : null;
}

function tryParseJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function mapErrorFromPayload(
  status: number,
  rawText: string,
  json: Record<string, unknown> | null,
  isAuthRedirectOrStatus: boolean
): ResumeUploadError {
  const code = typeof json?.code === 'string' ? json.code : '';
  const serverMessage = typeof json?.error === 'string' && json.error.trim() ? json.error.trim() : '';

  if (isAuthRedirectOrStatus || (!json && AUTH_URL_OR_HTML_RE.test(rawText))) {
    return new ResumeUploadError(
      'auth_required',
      serverMessage ||
        'Preview session authorization expired or was blocked by browser privacy settings. Click "Refresh Preview Session" (your saved skills and roadmap are preserved) and try uploading again.',
      status
    );
  }

  if (status === 413 || code === 'FILE_TOO_LARGE') {
    return new ResumeUploadError(
      'file_too_large',
      serverMessage ||
        'The uploaded file exceeds the server payload size limit (15 MB). Please upload a smaller PDF, DOCX, or TXT file.',
      status
    );
  }

  if (code === 'UNSUPPORTED_FILE') {
    return new ResumeUploadError(
      'unsupported_file',
      serverMessage ||
        'Unsupported file format. Please upload a valid PDF, DOCX, DOC, or TXT resume.',
      status
    );
  }

  if (code === 'EMPTY_DOCUMENT' || code === 'EXTRACTION_FAILED' || status === 422) {
    return new ResumeUploadError(
      'empty_document',
      serverMessage ||
        'Could not extract selectable text from this document. It may be an image-only scan, encrypted, or corrupted.',
      status
    );
  }

  if (status === 400 || code === 'NO_FILE') {
    return new ResumeUploadError(
      'unsupported_file',
      serverMessage || 'The server could not accept the uploaded resume file.',
      status
    );
  }

  if (status === 504) {
    return new ResumeUploadError(
      'timeout',
      serverMessage ||
        'The backend server timed out while processing your resume. Please retry or try a smaller text-based PDF/DOCX.',
      status
    );
  }

  if (status === 502 || status === 503 || /warmup|service unavailable|bad gateway/i.test(rawText)) {
    return new ResumeUploadError(
      'backend_unavailable',
      serverMessage ||
        'The backend resume parser service is currently unavailable or restarting. Wait a few seconds and retry.',
      status
    );
  }

  if (status === 404 || (status >= 200 && status < 300 && /<!doctype html|<html/i.test(rawText))) {
    return new ResumeUploadError(
      'backend_unavailable',
      'The /api/resume/parse backend endpoint was not reached (received an HTML page instead of API JSON). Ensure the Express backend server is running.',
      status
    );
  }

  return new ResumeUploadError(
    'server_error',
    serverMessage ||
      `Resume processing failed on the server (HTTP ${status || 'unknown'}). Please retry.`,
    status
  );
}

export async function uploadResumeForParsing(
  file: File,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<ExtractedResumeReviewData> {
  if (options?.signal?.aborted) {
    throw new ResumeUploadError(
      'cancelled',
      'Upload cancelled because a newer resume was selected or the staged file was removed.'
    );
  }

  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  let abortReason: 'timeout' | 'cancelled' | null = null;

  const timer = window.setTimeout(() => {
    abortReason = 'timeout';
    controller.abort();
  }, timeoutMs);

  const handleExternalAbort = () => {
    abortReason = 'cancelled';
    controller.abort();
  };
  options?.signal?.addEventListener('abort', handleExternalAbort, { once: true });

  const formData = new FormData();
  formData.append('resume', file, file.name);

  let res: Response;
  try {
    res = await fetch(buildApiUrl('/api/resume/parse'), {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch (err) {
    window.clearTimeout(timer);
    options?.signal?.removeEventListener('abort', handleExternalAbort);

    if (abortReason === 'cancelled' || options?.signal?.aborted) {
      throw new ResumeUploadError(
        'cancelled',
        'Upload cancelled because a newer resume was selected or the staged file was removed.'
      );
    }

    if (abortReason === 'timeout' || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new ResumeUploadError(
        'timeout',
        'Resume analysis timed out after 45 seconds. Please retry or test with a smaller text-based PDF/DOCX.'
      );
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ResumeUploadError(
        'network',
        'No network connection detected. Reconnect to the internet and click Retry.'
      );
    }

    // Probe /api/health with redirect: 'manual' to distinguish proxy auth redirects from offline backend
    const probe = await probeBackendStatus(3500);
    if (probe.status === 'auth_required') {
      throw new ResumeUploadError(
        'auth_required',
        'Preview session authorization expired or redirected during upload. Click "Refresh Preview Session" (your saved skills and roadmap are preserved) and try uploading again.'
      );
    }

    if (probe.status === 'unreachable') {
      throw new ResumeUploadError(
        'backend_unavailable',
        'Backend server is unreachable (/api/health did not respond). Ensure the SkillBridge Express server is running and retry.'
      );
    }

    throw new ResumeUploadError(
      'network',
      'The upload request was interrupted before receiving a server response. Please retry.'
    );
  } finally {
    window.clearTimeout(timer);
    options?.signal?.removeEventListener('abort', handleExternalAbort);
  }

  if (isAuthInterceptionResponse(res)) {
    throw mapErrorFromPayload(res.status, '', null, true);
  }

  const rawText = await res.text();
  const parsedJson = tryParseJson(rawText);

  if (!res.ok || !parsedJson) {
    throw mapErrorFromPayload(res.status, rawText, parsedJson, false);
  }

  if (!parsedJson.analysis || typeof parsedJson.extractedCharacters !== 'number') {
    throw new ResumeUploadError(
      'server_error',
      'Server returned an incomplete resume analysis payload. Please retry.',
      res.status
    );
  }

  return parsedJson as unknown as ExtractedResumeReviewData;
}

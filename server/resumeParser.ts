import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { extractResumeLocally, type StructuredResumeAnalysis } from './localResumeExtractor.ts';
import { analyzeResumeWithGemini } from './geminiResumeAnalyzer.ts';

export const MAX_RESUME_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_RESUME_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.txt']);
const GEMINI_TIMEOUT_MS = 7000;

export type ResumeErrorCode =
  | 'NO_FILE'
  | 'UNSUPPORTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_DOCUMENT'
  | 'EXTRACTION_FAILED'
  | 'SERVER_ERROR';

export class ResumeParseError extends Error {
  readonly status: number;
  readonly code: ResumeErrorCode;

  constructor(status: number, code: ResumeErrorCode, message: string) {
    super(message);
    this.name = 'ResumeParseError';
    this.status = status;
    this.code = code;
  }
}

export interface UploadedResumeInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ParsedResumeResponse {
  fileName: string;
  fileSizeBytes: number;
  format: string;
  extractedCharacters: number;
  extractedTextPreview: string;
  mode: 'gemini' | 'demo-local';
  geminiFallbackReason: 'not_configured' | 'timeout' | 'quota' | 'unavailable' | null;
  notice: string;
  analysis: StructuredResumeAnalysis;
}

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r?\n*--\s*\d+\s+of\s+\d+\s*--\r?\n*/g, '\n')
    .replace(/\u0000/g, '')
    .trim();
}

export async function extractTextFromResumeFile(
  file: UploadedResumeInput
): Promise<{ text: string; format: string }> {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (ext === '.pdf' || (!ext && mime === 'application/pdf')) {
    const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
    try {
      const result = await parser.getText();
      return {
        text: cleanExtractedText(result?.text ?? ''),
        format: 'PDF',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/password|encrypted/i.test(msg)) {
        throw new ResumeParseError(
          422,
          'EXTRACTION_FAILED',
          `"${file.originalname}" is password-protected or encrypted. Please export an unprotected text-based PDF and retry.`
        );
      }
      throw new ResumeParseError(
        422,
        'EXTRACTION_FAILED',
        `Could not extract text from "${file.originalname}". Ensure the PDF is valid and not corrupted.`
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (
    ext === '.docx' ||
    (!ext && mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return {
        text: cleanExtractedText(result?.value ?? ''),
        format: 'DOCX',
      };
    } catch {
      throw new ResumeParseError(
        422,
        'EXTRACTION_FAILED',
        `Could not read "${file.originalname}" as a valid DOCX document. Ensure the file is a standard Word (.docx) document.`
      );
    }
  }

  if (ext === '.doc' || (!ext && mime === 'application/msword')) {
    const raw = file.buffer.toString('utf-8').replace(/[^\x20-\x7E\r\n]/g, ' ');
    const cleaned = cleanExtractedText(raw.replace(/\s{3,}/g, '\n'));
    return {
      text: cleaned,
      format: 'DOC',
    };
  }

  if (ext === '.txt' || (!ext && mime === 'text/plain')) {
    return {
      text: cleanExtractedText(file.buffer.toString('utf-8')),
      format: 'TXT',
    };
  }

  throw new ResumeParseError(
    400,
    'UNSUPPORTED_FILE',
    `Unsupported file format "${ext || mime || 'unknown'}". Please upload a PDF, DOCX, DOC, or TXT resume.`
  );
}

export async function parseAndAnalyzeResume(
  file: UploadedResumeInput | undefined
): Promise<ParsedResumeResponse> {
  if (!file || !file.buffer) {
    throw new ResumeParseError(400, 'NO_FILE', 'No resume file was received by the server.');
  }

  if (file.size === 0 || file.buffer.length === 0) {
    throw new ResumeParseError(
      422,
      'EMPTY_DOCUMENT',
      `"${file.originalname}" is empty (0 bytes). Please upload a non-empty resume document.`
    );
  }

  if (file.size > MAX_RESUME_BYTES || file.buffer.length > MAX_RESUME_BYTES) {
    throw new ResumeParseError(
      413,
      'FILE_TOO_LARGE',
      `"${file.originalname}" exceeds the 15 MB upload limit. Please upload a smaller resume file.`
    );
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const allowedMimes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ]);

  if (ext && !ALLOWED_RESUME_EXTENSIONS.has(ext)) {
    throw new ResumeParseError(
      400,
      'UNSUPPORTED_FILE',
      `Unsupported file format "${ext}". Please upload a PDF, DOCX, DOC, or TXT resume.`
    );
  }

  if (!ext && !allowedMimes.has(mime)) {
    throw new ResumeParseError(
      400,
      'UNSUPPORTED_FILE',
      `Unsupported file MIME type "${mime || 'unknown'}". Please upload a PDF, DOCX, DOC, or TXT resume.`
    );
  }

  const { text: extractedText, format } = await extractTextFromResumeFile(file);

  if (extractedText.length < 35) {
    throw new ResumeParseError(
      422,
      'EMPTY_DOCUMENT',
      'No selectable text was found in this document. It appears to be an image-only scan or empty file. OCR is not enabled in Target A — please upload a text-based PDF, DOCX, or TXT resume.'
    );
  }

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  let mode: 'gemini' | 'demo-local' = 'demo-local';
  let geminiFallbackReason: ParsedResumeResponse['geminiFallbackReason'] = hasGeminiKey
    ? null
    : 'not_configured';
  let notice =
    'Demo Mode: Processed locally from your uploaded resume text (Gemini API key is not configured on the server).';
  let analysis: StructuredResumeAnalysis;

  if (hasGeminiKey) {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      analysis = await Promise.race([
        analyzeResumeWithGemini(extractedText),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), GEMINI_TIMEOUT_MS);
        }),
      ]);
      mode = 'gemini';
      geminiFallbackReason = null;
      notice = 'Live AI Extraction: Analyzed uploaded resume text with Gemini (gemini-4-hydrogen).';
    } catch (aiErr) {
      const message = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.warn(
        `[resume-parse] Gemini fallback for "${file.originalname}" (${format}, ${extractedText.length} chars): ${message}`
      );
      analysis = extractResumeLocally(extractedText);
      mode = 'demo-local';
      if (message.includes('GEMINI_TIMEOUT')) {
        geminiFallbackReason = 'timeout';
        notice =
          'Gemini AI timed out — completed transparently using deterministic local text extraction on your uploaded document.';
      } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        geminiFallbackReason = 'quota';
        notice =
          'Gemini API quota limit reached — completed transparently using deterministic local text extraction on your uploaded document.';
      } else {
        geminiFallbackReason = 'unavailable';
        notice =
          'Gemini API unavailable for this request — completed transparently using deterministic local text extraction on your uploaded document.';
      }
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  } else {
    analysis = extractResumeLocally(extractedText);
  }

  console.log(
    `[resume-parse] Parsed "${file.originalname}" (${format}, ${file.size} bytes) -> ${extractedText.length} chars, ${analysis.skillCandidates.length} skill candidates, mode=${mode}${geminiFallbackReason ? ` (${geminiFallbackReason})` : ''}`
  );

  return {
    fileName: file.originalname,
    fileSizeBytes: file.size,
    format,
    extractedCharacters: extractedText.length,
    extractedTextPreview: extractedText.slice(0, 1200),
    mode,
    geminiFallbackReason,
    notice,
    analysis,
  };
}

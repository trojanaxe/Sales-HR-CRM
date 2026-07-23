import { extname, join } from "path";
import { pathToFileURL } from "url";

// pdf.js (used internally by pdf-parse) tries to dynamically resolve its
// worker script relative to its own bundled location. Under Next.js/Turbopack
// that path gets rewritten into a chunk that doesn't exist on disk ("Setting
// up fake worker failed"), so we point it at the real file explicitly.
let workerConfigured = false;
async function ensureWorkerConfigured() {
  if (workerConfigured) return;
  const { PDFParse } = await import("pdf-parse");
  const workerPath = join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "pdf-parse",
    "cjs",
    "pdf.worker.mjs"
  );
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerConfigured = true;
}

export class UnsupportedResumeFormatError extends Error {
  constructor(ext: string) {
    super(
      `Unsupported resume file format "${ext}". Supported formats: .pdf, .docx (legacy .doc is not supported — please re-save as .docx or .pdf).`
    );
    this.name = "UnsupportedResumeFormatError";
  }
}

// pdf-parse's getText() inserts a "-- N of M --" page-break marker between
// pages, which otherwise leaks into keyword extraction as bogus content
// (e.g. when it's the last line of a "Skills" section with no header after
// it to bound the section).
const PAGE_BREAK_MARKER = /\n*--\s*\d+\s+of\s+\d+\s*--\n*/g;

async function extractFromPdf(buffer: Buffer): Promise<string> {
  await ensureWorkerConfigured();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.replace(PAGE_BREAK_MARKER, "\n");
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extracts plain text from a resume file buffer based on its extension.
 * Legacy `.doc` (binary Word format) is intentionally unsupported — mammoth
 * only handles the `.docx` XML format, and there is no lightweight pure-JS
 * parser for the old binary format.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = extname(fileName).toLowerCase();

  if (ext === ".pdf") return extractFromPdf(buffer);
  if (ext === ".docx") return extractFromDocx(buffer);

  throw new UnsupportedResumeFormatError(ext || "(none)");
}

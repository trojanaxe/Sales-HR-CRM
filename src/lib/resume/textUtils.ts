// Shared plain-text parsing helpers used by both the resume profile extractor
// and the JD extractor. Pure functions only — no I/O, no Prisma — so they can
// be unit tested in isolation.

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive dictionary lookup with (approximate) word boundaries, so
 * "C++"/"C#"/".NET" match correctly even though they end in non-word chars. */
export function findDictionaryMatches(text: string, terms: string[]): string[] {
  const found = new Set<string>();
  for (const term of terms) {
    const pattern = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegExp(term)}(?![A-Za-z0-9])`,
      "i"
    );
    if (pattern.test(text)) found.add(term);
  }
  return Array.from(found);
}

export interface SectionMatcher {
  key: string;
  pattern: RegExp;
}

/** Splits resume/JD text into named sections based on header lines (e.g. a
 * line reading just "Skills" or "Work Experience"). Returns a map of section
 * key -> the raw text following that header, up to the next recognized
 * header or the end of the document. */
export function splitIntoSections(
  text: string,
  matchers: SectionMatcher[],
  maxLinesPerSection = 60
): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const sections: Record<string, string> = {};

  let currentKey: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentKey) {
      sections[currentKey] = (sections[currentKey] || "") + buffer.join("\n");
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const header = matchers.find((m) => m.pattern.test(line));
    if (header && line.length < 60) {
      flush();
      currentKey = header.key;
      continue;
    }
    if (currentKey && buffer.length < maxLinesPerSection) {
      buffer.push(rawLine);
    }
  }
  flush();

  return sections;
}

// Prose fragments that occasionally leak into a skills/preferred-skills
// section when it runs unbounded to the end of the document (no following
// header to close it) — these words essentially never appear in a real
// skill/tool name, so filtering them out removes the noise without risking
// real skills.
const PROSE_FRAGMENT_PATTERN =
  /\b(required|preferred|years?|must|should|will|please|this is|experience|role|position|responsib)/i;

const PAGE_MARKER_PATTERN = /^\d+\s+of\s+\d+\s*-*$/i;

/** True for tokens that plausibly look like a skill/role/certification
 * name — used both when extracting from a document (splitTokens) and, more
 * importantly, as a defense-in-depth gate before a keyword is permanently
 * written into the shared learning dictionary (see learning.ts). A bad
 * extraction that only gets filtered at the extraction step can still leak
 * into future documents once it's been "learned"; gating at the persistence
 * boundary stops that regardless of which extractor produced the token. */
export function isLikelyValidKeyword(token: string): boolean {
  if (token.length < 2 || token.length > 40) return false;
  if (/^\d+$/.test(token)) return false;
  if (PROSE_FRAGMENT_PATTERN.test(token)) return false;
  if (PAGE_MARKER_PATTERN.test(token)) return false;
  // Real skill/role/cert names are essentially never 6+ words.
  if (token.trim().split(/\s+/).length > 5) return false;
  // Unbalanced parentheses is a strong signal the token was truncated out
  // of a longer sentence (e.g. "and more)", "MySQL (schema design").
  const openParens = (token.match(/\(/g) || []).length;
  const closeParens = (token.match(/\)/g) || []).length;
  if (openParens !== closeParens) return false;
  return true;
}

/** Splits a section's raw text into individual candidate keyword tokens,
 * handling comma/semicolon/pipe/bullet-separated lists as well as one-per-line
 * lists. */
export function splitTokens(sectionText: string): string[] {
  return sectionText
    .split(/[\n,;|•·]|(?:^|\s)[-*]\s/)
    .map((t) => t.trim().replace(/^[-*•·:]+|[.:]+$/g, "").trim())
    .filter(isLikelyValidKeyword);
}

const DEGREE_PATTERN =
  /\b(b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|mba|ph\.?d|bachelor'?s?|master'?s?|diploma|b\.?\s?e\.?|m\.?\s?e\.?|bca|mca|associate'?s? degree)\b/i;
const YEAR_PATTERN = /\b(19|20)\d{2}\b/;

export interface EducationLine {
  degree: string;
  institution?: string;
  year?: string;
}

export function extractEducationEntries(sectionText: string): EducationLine[] {
  const lines = sectionText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: EducationLine[] = [];
  for (const line of lines) {
    if (!DEGREE_PATTERN.test(line)) continue;
    const yearMatch = line.match(YEAR_PATTERN);
    const parts = line.split(",").map((p) => p.trim());
    entries.push({
      degree: parts[0] || line,
      institution: parts.length > 1 ? parts[1] : undefined,
      year: yearMatch ? yearMatch[0] : undefined,
    });
    if (entries.length >= 10) break;
  }
  return entries;
}

const EXPLICIT_EXPERIENCE_PATTERN =
  /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp\b)/gi;

const DATE_RANGE_PATTERN =
  /\b(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(present|current|now|(20\d{2}|19\d{2}))\b/gi;

/** Best-effort estimate of total years of experience, combining explicit
 * "N years of experience" mentions with a span computed from date ranges
 * found in the work-history section (e.g. "2018 - Present"). */
export function estimateTotalExperienceYears(text: string): number | null {
  let best: number | null = null;

  for (const match of text.matchAll(EXPLICIT_EXPERIENCE_PATTERN)) {
    const value = parseFloat(match[1]);
    if (!Number.isNaN(value) && (best === null || value > best)) best = value;
  }

  const currentYear = new Date().getFullYear();
  let minStart: number | null = null;
  let maxEnd: number | null = null;
  for (const match of text.matchAll(DATE_RANGE_PATTERN)) {
    const start = parseInt(match[1], 10);
    const endToken = match[2].toLowerCase();
    const end = ["present", "current", "now"].includes(endToken)
      ? currentYear
      : parseInt(match[3], 10);
    if (minStart === null || start < minStart) minStart = start;
    if (maxEnd === null || end > maxEnd) maxEnd = end;
  }
  if (minStart !== null && maxEnd !== null && maxEnd > minStart) {
    const span = maxEnd - minStart;
    if (best === null || span > best) best = span;
  }

  return best === null ? null : Math.round(best * 10) / 10;
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/;

export function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_PATTERN);
  return match ? match[0] : null;
}

export function extractPhone(text: string): string | null {
  const match = text.match(PHONE_PATTERN);
  return match ? match[0].trim() : null;
}

/** Heuristic: a resume's candidate name is almost always the first
 * non-empty line, provided that line isn't itself contact info or a
 * generic document title. */
export function extractName(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (const line of lines.slice(0, 5)) {
    if (!line) continue;
    if (EMAIL_PATTERN.test(line)) return null;
    if (/^(curriculum vitae|resume|cv)$/i.test(line)) continue;
    if (line.length > 60) return null;
    if (/^\d+$/.test(line)) return null;
    return line;
  }
  return null;
}

/** Extracts the value after an explicit label like "Notice Period:" or
 * "Current CTC -". Only matches when the label is actually present —
 * never guesses a value from surrounding context, since fields like CTC
 * must not be fabricated. Commas are excluded from the value by default
 * (they usually separate the value from trailing commentary), but some
 * fields — like "City, State" locations — need them allowed. */
export function extractLabeledField(
  text: string,
  labels: string[],
  options: { allowComma?: boolean } = {}
): string | null {
  const stopChars = options.allowComma ? "\\n;" : "\\n,;";
  for (const label of labels) {
    const pattern = new RegExp(`${escapeRegExp(label)}\\s*[:\\-]\\s*([^${stopChars}]{1,60})`, "i");
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (value.length >= 1) return value;
    }
  }
  return null;
}

const NOTICE_PERIOD_LABELS = ["notice period", "notice"];
const CURRENT_CTC_LABELS = ["current ctc", "current salary", "current compensation"];
const EXPECTED_CTC_LABELS = ["expected ctc", "expected salary", "expected compensation"];

export function extractNoticePeriod(text: string): string | null {
  return extractLabeledField(text, NOTICE_PERIOD_LABELS);
}

export function extractCurrentCTC(text: string): string | null {
  return extractLabeledField(text, CURRENT_CTC_LABELS);
}

export function extractExpectedCTC(text: string): string | null {
  return extractLabeledField(text, EXPECTED_CTC_LABELS);
}

/** Best-effort current job title: scans the first few lines of the
 * work-experience section for a recognized role keyword, since resumes are
 * almost always listed reverse-chronologically (most recent role first). */
export function extractCurrentJobTitle(
  experienceSectionText: string,
  roleDictionary: string[]
): string | null {
  const lines = experienceSectionText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4);
  for (const line of lines) {
    const matches = findDictionaryMatches(line, roleDictionary);
    if (matches.length > 0) {
      // Prefer the most specific match — e.g. "Senior Software Engineer"
      // over "Software Engineer" when both are present in the dictionary
      // and the line contains the more specific title.
      return matches.reduce((longest, m) => (m.length > longest.length ? m : longest));
    }
  }
  return null;
}

const COMPANY_AT_PATTERN = /\bat\s+([A-Z][A-Za-z0-9&.,'\- ]{1,50})/;

/** Best-effort list of companies worked at. No NER model is used — this
 * relies on common resume line shapes ("<Title> at <Company>" or
 * "<Title>, <Company>, <dates>") and will miss unconventional formats. */
export function extractCompanies(
  experienceSectionText: string,
  roleDictionary: string[]
): string[] {
  const lines = experienceSectionText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const companies: string[] = [];
  for (const line of lines) {
    const atMatch = line.match(COMPANY_AT_PATTERN);
    if (atMatch) {
      companies.push(atMatch[1].trim());
      continue;
    }
    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2 && findDictionaryMatches(parts[0], roleDictionary).length > 0) {
      companies.push(parts[1]);
    }
  }
  return companies.filter((c) => c.length >= 2 && c.length <= 60).slice(0, 15);
}

const WORK_MODEL_TERMS: Record<string, string> = {
  remote: "Remote",
  "work from home": "Remote",
  wfh: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
  "on-site": "Onsite",
  "in-office": "Onsite",
  "in office": "Onsite",
};

export function extractWorkModel(text: string): string | null {
  for (const [term, label] of Object.entries(WORK_MODEL_TERMS)) {
    const pattern = new RegExp(`(?<![A-Za-z])${escapeRegExp(term)}(?![A-Za-z])`, "i");
    if (pattern.test(text)) return label;
  }
  return null;
}

const EMPLOYMENT_TYPE_TERMS: Record<string, string> = {
  "full-time": "Full-time",
  "full time": "Full-time",
  "part-time": "Part-time",
  "part time": "Part-time",
  "contract-to-hire": "Contract-to-Hire",
  c2h: "Contract-to-Hire",
  c2c: "C2C",
  w2: "W2",
  contract: "Contract",
  permanent: "Permanent",
  temporary: "Temporary",
  internship: "Internship",
};

export function extractEmploymentType(text: string): string | null {
  for (const [term, label] of Object.entries(EMPLOYMENT_TYPE_TERMS)) {
    const pattern = new RegExp(`(?<![A-Za-z])${escapeRegExp(term)}(?![A-Za-z])`, "i");
    if (pattern.test(text)) return label;
  }
  return null;
}

const LOCATION_LABELS = ["location", "work location", "job location"];

export function extractLocation(text: string): string | null {
  return extractLabeledField(text, LOCATION_LABELS, { allowComma: true });
}

const JOB_TITLE_LABELS = ["job title", "position", "role title", "title"];

/** Best-effort JD job title: an explicit label if present, else the first
 * short line of the document (JDs conventionally open with the role name). */
export function extractJobTitle(text: string): string | null {
  const labeled = extractLabeledField(text, JOB_TITLE_LABELS);
  if (labeled) return labeled;

  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 80 && !EMAIL_PATTERN.test(firstLine)) {
    return firstLine;
  }
  return null;
}

const EDUCATION_REQUIREMENT_PATTERN =
  /[^\n.]*\b(bachelor'?s?|master'?s?|b\.?\s?tech|m\.?\s?tech|mba|ph\.?d|degree)\b[^\n.]*/i;

/** Best-effort education requirement line from a JD (e.g. "Bachelor's
 * degree in Computer Science or related field required"). */
export function extractEducationRequirement(text: string): string | null {
  const match = text.match(EDUCATION_REQUIREMENT_PATTERN);
  return match ? match[0].trim() : null;
}

const RELEVANT_EXPERIENCE_PATTERN =
  /(\d+(?:\.\d+)?)\+?\s*years?\s+(?:of\s+)?(?:relevant|hands-on|hands on|direct)\s+experience/i;

/** Distinguishes "X years of *relevant* experience" from generic total
 * years of experience — JDs sometimes ask for relevant experience narrower
 * than a candidate's total career length. */
export function extractRelevantExperienceYears(text: string): number | null {
  const match = text.match(RELEVANT_EXPERIENCE_PATTERN);
  return match ? parseFloat(match[1]) : null;
}

import { mkdir, readFile, writeFile } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { extractTextFromFile } from "./textExtract";
import { parseResumeText } from "./profileExtractor";
import { parseJDText } from "./jdExtractor";
import { computeMatchScore, buildEvidence } from "./matcher";
import {
  getKeywordWeights,
  jdProfileToKeywordHits,
  loadDictionary,
  recordKeywords,
  resumeProfileToKeywordHits,
} from "./learning";
import { findDuplicateCandidates, DuplicateCandidate } from "./duplicateDetection";
import { nextCandidateId } from "@/lib/ids";
import {
  ExtractedResumeProfile,
  MatchCandidateInput,
  MatchJDInput,
  MatchResult,
} from "./types";
import { CandidateSource, Prisma } from "@prisma/client";

const VALID_CANDIDATE_SOURCES: CandidateSource[] = ["bench", "external", "referral", "other"];

function normalizeCandidateSource(value: string | undefined): CandidateSource {
  const lower = (value || "").toLowerCase();
  return (VALID_CANDIDATE_SOURCES as string[]).includes(lower)
    ? (lower as CandidateSource)
    : "external";
}

const RESUME_DIR =
  process.env.RESUME_STORAGE_PATH || join(process.cwd(), "uploads", "resumes");

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return Array.from(seen.values());
}

export class ResumeNotFoundError extends Error {}
export class JDNotUploadedError extends Error {}
export class DuplicateCandidateError extends Error {
  constructor(public duplicates: DuplicateCandidate[]) {
    super("Likely duplicate candidate(s) found");
  }
}

function jsonify<T>(value: T): T {
  return value as unknown as T;
}

// ─── Resume parsing ────────────────────────────────────────────────────────

function resumeProfileWriteData(text: string, profile: ExtractedResumeProfile) {
  return {
    extractedText: text,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    skills: profile.skills,
    technologies: profile.technologies,
    roles: profile.roles,
    industries: profile.industries,
    certifications: profile.certifications,
    education: jsonify(profile.education) as unknown as Prisma.InputJsonValue,
    projects: jsonify(profile.projects) as unknown as Prisma.InputJsonValue,
    totalExperienceYears: profile.totalExperienceYears,
    keywords: profile.keywords,
    currentJobTitle: profile.currentJobTitle,
    companies: profile.companies,
    noticePeriod: profile.noticePeriod,
    currentCTC: profile.currentCTC,
    expectedCTC: profile.expectedCTC,
    location: profile.location,
  };
}

/** Syncs a candidate's editable fields with what was freshly extracted from
 * their resume — only fills in fields the candidate record doesn't already
 * have a value for (skills are unioned instead, since they're a list), so a
 * recruiter's manual edits are never silently overwritten. */
async function syncCandidateFromProfile(candidateId: string, profile: ExtractedResumeProfile) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      skills: true,
      certifications: true,
      experience: true,
      currentJobTitle: true,
      companiesWorkedFor: true,
      noticePeriod: true,
      currentCTC: true,
      expectedCTC: true,
      currentLocation: true,
    },
  });
  if (!candidate) return;

  // Manually-created candidates get "" (not null) as the default for text
  // fields (see CandidateForm), so treat blank strings as "no value on
  // file" too — otherwise the `??` fallback below would never fill in a
  // parsed value for those records.
  const isBlank = (v: string | null | undefined) => !v || !v.trim();

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      skills: dedupeCaseInsensitive([...candidate.skills, ...profile.skills]),
      certifications: dedupeCaseInsensitive([...candidate.certifications, ...profile.certifications]),
      experience: candidate.experience ?? profile.totalExperienceYears ?? undefined,
      currentJobTitle: candidate.currentJobTitle ?? profile.currentJobTitle ?? undefined,
      companiesWorkedFor: dedupeCaseInsensitive([
        ...candidate.companiesWorkedFor,
        ...profile.companies,
      ]),
      noticePeriod: candidate.noticePeriod ?? profile.noticePeriod ?? undefined,
      currentCTC: candidate.currentCTC ?? profile.currentCTC ?? undefined,
      expectedCTC: candidate.expectedCTC ?? profile.expectedCTC ?? undefined,
      currentLocation: isBlank(candidate.currentLocation) ? (profile.location ?? undefined) : undefined,
    },
  });
}

/** Parses (or re-parses) a candidate's resume file into a structured
 * ResumeProfile, growing the shared keyword dictionary and syncing the
 * candidate's editable fields with what was extracted. */
export async function parseResumeAndPersist(resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new ResumeNotFoundError(`Resume ${resumeId} not found`);

  const buffer = await readFile(resume.filePath);
  const text = await extractTextFromFile(buffer, resume.fileName);
  const dictionary = await loadDictionary();
  const profile = parseResumeText(text, dictionary);

  await recordKeywords(resumeProfileToKeywordHits(profile), "resume");

  const writeData = resumeProfileWriteData(text, profile);
  const saved = await prisma.resumeProfile.upsert({
    where: { resumeId },
    create: { resumeId, candidateId: resume.candidateId, ...writeData },
    update: { ...writeData, parsedAt: new Date() },
  });

  await syncCandidateFromProfile(resume.candidateId, profile);

  return saved;
}

// ─── Duplicate-aware resume-database upload ───────────────────────────────

export interface CreateCandidateFromResumeOptions {
  /** When a likely duplicate was already surfaced to the user, this tells
   * us how to resolve it instead of re-running detection. */
  resolution?: { action: "create_new" } | { action: "update_existing"; candidateId: string };
  source?: string;
  sourceDetail?: string;
}

export interface CreateCandidateFromResumeResult {
  status: "created" | "updated" | "duplicate";
  candidateId?: string;
  duplicates?: DuplicateCandidate[];
  parsedName?: string | null;
  parsedEmail?: string | null;
}

/** Core of the Resume Database's upload flow: parses a resume from a raw
 * buffer BEFORE persisting anything, checks it against the existing
 * candidate pool, and only then either creates a new candidate, attaches
 * the resume to an existing one (per the caller's resolution), or reports
 * the duplicate back without writing anything — so a rejected/undecided
 * upload never leaves orphaned files or records behind. */
export async function createCandidateFromResumeUpload(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  uploadedById: string,
  options: CreateCandidateFromResumeOptions = {}
): Promise<CreateCandidateFromResumeResult> {
  const text = await extractTextFromFile(buffer, fileName);
  const dictionary = await loadDictionary();
  const profile = parseResumeText(text, dictionary);

  if (!options.resolution) {
    const duplicates = await findDuplicateCandidates(profile);
    if (duplicates.length > 0) {
      return {
        status: "duplicate",
        duplicates,
        parsedName: profile.name,
        parsedEmail: profile.email,
      };
    }
  }

  const targetCandidateId =
    options.resolution?.action === "update_existing" ? options.resolution.candidateId : null;

  const candidateId =
    targetCandidateId ??
    (
      await prisma.candidate.create({
        data: {
          candidateId: await nextCandidateId(),
          name: profile.name || "Unknown Candidate",
          email: profile.email,
          phone: profile.phone,
          currentLocation: profile.location,
          skills: profile.skills,
          certifications: profile.certifications,
          experience: profile.totalExperienceYears ?? undefined,
          currentJobTitle: profile.currentJobTitle,
          companiesWorkedFor: profile.companies,
          noticePeriod: profile.noticePeriod,
          currentCTC: profile.currentCTC,
          expectedCTC: profile.expectedCTC,
          source: normalizeCandidateSource(options.source),
          sourceDetail: options.sourceDetail,
          ownerId: uploadedById,
        },
      })
    ).id;

  const ext = extname(fileName) || ".pdf";
  const filename = `${randomUUID()}${ext}`;
  const candidateDir = join(RESUME_DIR, candidateId);
  await mkdir(candidateDir, { recursive: true });
  const filePath = join(candidateDir, filename);
  await writeFile(filePath, buffer);

  if (targetCandidateId) {
    await prisma.resume.updateMany({
      where: { candidateId: targetCandidateId, isActive: true },
      data: { isActive: false },
    });
  }

  const resume = await prisma.resume.create({
    data: { candidateId, filePath, fileName, mimeType, isActive: true, uploadedById },
  });

  await recordKeywords(resumeProfileToKeywordHits(profile), "resume");
  const writeData = resumeProfileWriteData(text, profile);
  await prisma.resumeProfile.upsert({
    where: { resumeId: resume.id },
    create: { resumeId: resume.id, candidateId, ...writeData },
    update: { ...writeData, parsedAt: new Date() },
  });

  if (targetCandidateId) {
    await syncCandidateFromProfile(targetCandidateId, profile);
  }

  await prisma.note.create({
    data: {
      body: `Resume uploaded via Resume Database: ${fileName}`,
      authorId: uploadedById,
      candidateId,
    },
  });

  return {
    status: targetCandidateId ? "updated" : "created",
    candidateId,
    parsedName: profile.name,
    parsedEmail: profile.email,
  };
}

// ─── JD parsing (Requirement-scoped) ──────────────────────────────────────

function jdProfileWriteData(text: string, jd: ReturnType<typeof parseJDText>) {
  return {
    extractedText: text,
    jobTitle: jd.jobTitle,
    requiredSkills: jd.requiredSkills,
    preferredSkills: jd.preferredSkills,
    certificationsRequired: jd.certificationsRequired,
    domainKeywords: jd.domainKeywords,
    keywords: jd.keywords,
    minExperienceYears: jd.minExperienceYears,
    maxExperienceYears: jd.maxExperienceYears,
    relevantExperienceYears: jd.relevantExperienceYears,
    location: jd.location,
    workModel: jd.workModel,
    employmentType: jd.employmentType,
    educationRequirement: jd.educationRequirement,
  };
}

/** Parses (or re-parses) a requirement's JD into a structured JDProfile.
 * Sources from the uploaded JD file if one exists, otherwise falls back to
 * pasted JD text (`Requirement.jdText`) — either way the rest of the
 * matching pipeline treats the two identically. */
export async function parseJDAndPersist(requirementId: string) {
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
  });
  if (!requirement) throw new ResumeNotFoundError(`Requirement ${requirementId} not found`);

  let text: string;
  if (requirement.jdFilePath) {
    const buffer = await readFile(requirement.jdFilePath);
    text = await extractTextFromFile(buffer, requirement.jdFilePath);
  } else if (requirement.jdText && requirement.jdText.trim()) {
    text = requirement.jdText;
  } else {
    throw new JDNotUploadedError(
      `Requirement ${requirementId} has no JD file or pasted JD text`
    );
  }

  const dictionary = await loadDictionary();
  const jd = parseJDText(text, dictionary);

  await recordKeywords(jdProfileToKeywordHits(jd), "jd");

  const writeData = jdProfileWriteData(text, jd);
  return prisma.jDProfile.upsert({
    where: { requirementId },
    create: { requirementId, ...writeData },
    update: { ...writeData, parsedAt: new Date() },
  });
}

// ─── Ad-hoc JD (standalone JD Candidate Matching module) ──────────────────

export interface CreateAdhocJDInput {
  title?: string;
  jdText?: string;
  file?: { buffer: Buffer; fileName: string };
  createdById: string;
}

const JD_DIR = process.env.JD_STORAGE_PATH || join(process.cwd(), "uploads", "jd");

/** Creates and immediately parses a standalone JD, independent of any
 * Requirement — the basis of the JD Candidate Matching module. */
export async function createAndParseAdhocJD(input: CreateAdhocJDInput) {
  if (!input.jdText?.trim() && !input.file) {
    throw new JDNotUploadedError("Either jdText or a JD file is required");
  }

  let jdFilePath: string | undefined;
  let text: string;
  if (input.file) {
    const ext = extname(input.file.fileName) || ".pdf";
    const filename = `${randomUUID()}${ext}`;
    await mkdir(JD_DIR, { recursive: true });
    jdFilePath = join(JD_DIR, filename);
    await writeFile(jdFilePath, input.file.buffer);
    text = await extractTextFromFile(input.file.buffer, input.file.fileName);
  } else {
    text = input.jdText!;
  }

  const dictionary = await loadDictionary();
  const jd = parseJDText(text, dictionary);
  await recordKeywords(jdProfileToKeywordHits(jd), "jd");

  const writeData = jdProfileWriteData(text, jd);
  return prisma.adhocJD.create({
    data: {
      title: input.title || jd.jobTitle || undefined,
      createdById: input.createdById,
      jdFilePath,
      jdText: input.jdText,
      ...writeData,
      parsedAt: new Date(),
    },
  });
}

// ─── Matching ──────────────────────────────────────────────────────────────

export interface CandidateMatch {
  candidateId: string;
  candidateName: string;
  resumeId: string;
  match: MatchResult;
}

interface JDLike {
  requiredSkills: string[];
  preferredSkills: string[];
  certificationsRequired: string[];
  domainKeywords: string[];
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  relevantExperienceYears: number | null;
  jobTitle: string | null;
  location: string | null;
  workModel: string | null;
}

function toMatchJDInput(jd: JDLike): MatchJDInput {
  return {
    requiredSkills: jd.requiredSkills,
    preferredSkills: jd.preferredSkills,
    minExperienceYears: jd.minExperienceYears,
    maxExperienceYears: jd.maxExperienceYears,
    relevantExperienceYears: jd.relevantExperienceYears,
    jobTitle: jd.jobTitle,
    certificationsRequired: jd.certificationsRequired,
    domainKeywords: jd.domainKeywords,
    location: jd.location,
    workModel: jd.workModel,
  };
}

async function rankCandidatesAgainstJD(jd: JDLike, limit: number): Promise<CandidateMatch[]> {
  const resumeProfiles = await prisma.resumeProfile.findMany({
    where: { resume: { isActive: true } },
    include: {
      resume: {
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              currentJobTitle: true,
              currentLocation: true,
              willingToRelocate: true,
            },
          },
        },
      },
    },
  });

  const weights = await getKeywordWeights([
    ...jd.requiredSkills,
    ...jd.preferredSkills,
    ...jd.certificationsRequired,
  ]);
  const jdInput = toMatchJDInput(jd);

  const matches: CandidateMatch[] = resumeProfiles.map((rp) => {
    const candidateInput: MatchCandidateInput = {
      keywords: rp.keywords,
      totalExperienceYears: rp.totalExperienceYears,
      roles: rp.roles,
      certifications: rp.certifications,
      industries: rp.industries,
      currentJobTitle: rp.resume.candidate.currentJobTitle || rp.currentJobTitle,
      currentLocation: rp.resume.candidate.currentLocation,
      willingToRelocate: rp.resume.candidate.willingToRelocate,
      projects: (rp.projects as string[] | null) || [],
    };
    const match = computeMatchScore(candidateInput, jdInput, weights);
    match.evidence = buildEvidence(rp.extractedText, [
      ...match.matchedSkills,
      ...match.matchedPreferredSkills,
      ...match.factors.certifications.matched,
    ]);
    return {
      candidateId: rp.resume.candidate.id,
      candidateName: rp.resume.candidate.name,
      resumeId: rp.resumeId,
      match,
    };
  });

  matches.sort((a, b) => b.match.overallScore - a.match.overallScore);
  return matches.slice(0, limit);
}

/** Ranks every candidate with a parsed resume profile against a requirement's
 * JD profile, highest overallScore first. */
export async function rankCandidatesForRequirement(
  requirementId: string,
  limit = 50
): Promise<CandidateMatch[]> {
  const jdProfile = await prisma.jDProfile.findUnique({ where: { requirementId } });
  if (!jdProfile) {
    throw new JDNotUploadedError(`Requirement ${requirementId} has no parsed JD profile yet`);
  }
  return rankCandidatesAgainstJD(jdProfile, limit);
}

/** Ranks every candidate with a parsed resume profile against a standalone
 * ad-hoc JD, highest overallScore first — the JD Candidate Matching module's
 * core query. Callers filter by the configured minimum score threshold. */
export async function rankCandidatesForAdhocJD(
  adhocJDId: string,
  limit = 200
): Promise<CandidateMatch[]> {
  const jd = await prisma.adhocJD.findUnique({ where: { id: adhocJDId } });
  if (!jd) throw new JDNotUploadedError(`Ad-hoc JD ${adhocJDId} not found`);
  if (!jd.parsedAt) throw new JDNotUploadedError(`Ad-hoc JD ${adhocJDId} has not been parsed yet`);
  return rankCandidatesAgainstJD(jd, limit);
}

/** Scores a single candidate's active resume against a requirement's JD. */
export async function matchCandidateAgainstRequirement(
  candidateId: string,
  requirementId: string
): Promise<MatchResult> {
  const jdProfile = await prisma.jDProfile.findUnique({ where: { requirementId } });
  if (!jdProfile) {
    throw new JDNotUploadedError(`Requirement ${requirementId} has no parsed JD profile yet`);
  }
  return matchOneCandidate(candidateId, jdProfile);
}

/** Scores a single candidate's active resume against a standalone ad-hoc JD. */
export async function matchCandidateAgainstAdhocJD(
  candidateId: string,
  adhocJDId: string
): Promise<MatchResult> {
  const jd = await prisma.adhocJD.findUnique({ where: { id: adhocJDId } });
  if (!jd || !jd.parsedAt) {
    throw new JDNotUploadedError(`Ad-hoc JD ${adhocJDId} has not been parsed yet`);
  }
  return matchOneCandidate(candidateId, jd);
}

async function matchOneCandidate(candidateId: string, jd: JDLike): Promise<MatchResult> {
  const resumeProfile = await prisma.resumeProfile.findFirst({
    where: { candidateId, resume: { isActive: true } },
  });
  if (!resumeProfile) {
    throw new ResumeNotFoundError(`Candidate ${candidateId} has no parsed resume profile yet`);
  }
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { currentJobTitle: true, currentLocation: true, willingToRelocate: true },
  });

  const weights = await getKeywordWeights([
    ...jd.requiredSkills,
    ...jd.preferredSkills,
    ...jd.certificationsRequired,
  ]);

  const candidateInput: MatchCandidateInput = {
    keywords: resumeProfile.keywords,
    totalExperienceYears: resumeProfile.totalExperienceYears,
    roles: resumeProfile.roles,
    certifications: resumeProfile.certifications,
    industries: resumeProfile.industries,
    currentJobTitle: candidate?.currentJobTitle || resumeProfile.currentJobTitle,
    currentLocation: candidate?.currentLocation,
    willingToRelocate: candidate?.willingToRelocate,
    projects: (resumeProfile.projects as string[] | null) || [],
  };

  const match = computeMatchScore(candidateInput, toMatchJDInput(jd), weights);
  match.evidence = buildEvidence(resumeProfile.extractedText, [
    ...match.matchedSkills,
    ...match.matchedPreferredSkills,
    ...match.factors.certifications.matched,
  ]);
  return match;
}

// ─── Match settings (configurable score threshold) ────────────────────────

export async function getMinMatchScore(): Promise<number> {
  const settings = await prisma.matchSettings.findUnique({ where: { id: "singleton" } });
  return settings?.minMatchScore ?? 70;
}

export async function setMinMatchScore(value: number, updatedById: string): Promise<number> {
  const clamped = Math.min(100, Math.max(0, value));
  const settings = await prisma.matchSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", minMatchScore: clamped, updatedById },
    update: { minMatchScore: clamped, updatedById },
  });
  return settings.minMatchScore;
}

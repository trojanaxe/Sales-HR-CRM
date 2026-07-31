import { prisma } from "@/lib/prisma";
import { ExtractedResumeProfile } from "./types";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) if (setB.has(item)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export type DuplicateMatchReason = "email" | "phone" | "name" | "resume_similarity";

export interface DuplicateCandidate {
  id: string;
  candidateId: string;
  name: string;
  email: string | null;
  phone: string | null;
  reasons: DuplicateMatchReason[];
}

/**
 * Checks whether a newly-parsed resume profile likely belongs to a
 * candidate already in the database, using (in order of confidence) exact
 * email match, normalized phone match, exact name match, and — for
 * candidates only caught by a fuzzy/partial name match — resume keyword
 * similarity as a confirming signal. Returns an empty array when nothing
 * looks like a duplicate, in which case the caller should create a new
 * candidate record.
 */
export async function findDuplicateCandidates(
  profile: Pick<ExtractedResumeProfile, "name" | "email" | "phone" | "keywords">
): Promise<DuplicateCandidate[]> {
  const reasonsByCandidateId = new Map<string, Set<DuplicateMatchReason>>();

  const addReason = (candidateId: string, reason: DuplicateMatchReason) => {
    if (!reasonsByCandidateId.has(candidateId)) reasonsByCandidateId.set(candidateId, new Set());
    reasonsByCandidateId.get(candidateId)!.add(reason);
  };

  if (profile.email) {
    const matches = await prisma.candidate.findMany({
      where: { email: { equals: profile.email, mode: "insensitive" } },
      select: { id: true },
    });
    matches.forEach((m) => addReason(m.id, "email"));
  }

  if (profile.phone) {
    const normalized = normalizePhone(profile.phone);
    if (normalized.length >= 7) {
      const candidates = await prisma.candidate.findMany({
        where: { phone: { not: null } },
        select: { id: true, phone: true },
      });
      for (const c of candidates) {
        if (c.phone && normalizePhone(c.phone) === normalized) addReason(c.id, "phone");
      }
    }
  }

  let fuzzyNameMatches: { id: string; name: string }[] = [];
  if (profile.name) {
    const exact = await prisma.candidate.findMany({
      where: { name: { equals: profile.name, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    exact.forEach((m) => addReason(m.id, "name"));

    fuzzyNameMatches = await prisma.candidate.findMany({
      where: {
        name: { contains: profile.name, mode: "insensitive" },
        id: { notIn: exact.map((m) => m.id) },
      },
      select: { id: true, name: true },
      take: 20,
    });
  }

  // Fuzzy name matches alone are weak — only count them as a duplicate
  // signal if the candidate's most recent resume is also keyword-similar.
  if (fuzzyNameMatches.length > 0 && profile.keywords.length > 0) {
    const profiles = await prisma.resumeProfile.findMany({
      where: { candidateId: { in: fuzzyNameMatches.map((m) => m.id) }, resume: { isActive: true } },
      select: { candidateId: true, keywords: true },
    });
    for (const rp of profiles) {
      if (jaccardSimilarity(profile.keywords, rp.keywords) >= 0.5) {
        addReason(rp.candidateId, "resume_similarity");
      }
    }
  }

  if (reasonsByCandidateId.size === 0) return [];

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: Array.from(reasonsByCandidateId.keys()) } },
    select: { id: true, candidateId: true, name: true, email: true, phone: true },
  });

  return candidates.map((c) => ({
    ...c,
    reasons: Array.from(reasonsByCandidateId.get(c.id) ?? []),
  }));
}

import { prisma } from "@/lib/prisma";
import { KeywordCategory, seedDictionary } from "./dictionary";
import { ExtractedJDProfile, ExtractedResumeProfile } from "./types";
import { isLikelyValidKeyword } from "./textUtils";

/**
 * Loads the keyword dictionary used for extraction: the built-in seed list
 * merged with every keyword the CRM has learned from real resumes/JDs so far
 * (SkillKeyword table). This is the "candidate learning system" — as more
 * resumes are parsed, previously-unseen skills/roles/industries surfaced from
 * explicit "Skills"/"Certifications" sections get added here, so future
 * extraction recognizes them too.
 */
export async function loadDictionary(): Promise<Record<KeywordCategory, string[]>> {
  const seed = seedDictionary();
  const learned = await prisma.skillKeyword.findMany({
    select: { keyword: true, category: true },
  });

  const merged: Record<KeywordCategory, Set<string>> = {
    skill: new Set(seed.skill),
    role: new Set(seed.role),
    industry: new Set(seed.industry),
    certification: new Set(seed.certification),
  };

  for (const entry of learned) {
    merged[entry.category as KeywordCategory].add(entry.keyword);
  }

  return {
    skill: Array.from(merged.skill),
    role: Array.from(merged.role),
    industry: Array.from(merged.industry),
    certification: Array.from(merged.certification),
  };
}

export interface KeywordHit {
  keyword: string;
  category: KeywordCategory;
}

/**
 * Records that these keywords were seen in a parsed document, incrementing
 * frequency counts (used both to grow the dictionary and to weight rarer
 * skills more heavily during JD matching — see matcher.ts). Keywords that
 * don't look like a plausible skill/role/cert name are rejected here even
 * if an upstream extractor let them through — this is the last line of
 * defense against a bad extraction becoming permanent, self-reinforcing
 * dictionary pollution (a bug that only filters at extraction time doesn't
 * protect documents parsed *after* the bad keyword was already learned).
 */
export async function recordKeywords(
  hits: KeywordHit[],
  source: "resume" | "jd"
): Promise<void> {
  const deduped = new Map<string, KeywordCategory>();
  for (const hit of hits) {
    const key = hit.keyword.trim();
    if (!isLikelyValidKeyword(key)) continue;
    deduped.set(key, hit.category);
  }

  await Promise.all(
    Array.from(deduped.entries()).map(([keyword, category]) =>
      prisma.skillKeyword.upsert({
        where: { keyword },
        create: { keyword, category, source, frequency: 1 },
        update: { frequency: { increment: 1 }, lastSeenAt: new Date() },
      })
    )
  );
}

/**
 * Returns inverse-frequency weights (lowercased keyword -> weight) for the
 * given keywords: skills seen rarely across the CRM's corpus score higher,
 * since a rare-skill match is a stronger signal than a common one (e.g.
 * "Communication" vs. "Salesforce CPQ").
 */
export async function getKeywordWeights(
  keywords: string[]
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(keywords.map((k) => k.toLowerCase())));
  if (unique.length === 0) return new Map();

  const rows = await prisma.skillKeyword.findMany({
    where: { keyword: { in: unique, mode: "insensitive" } },
    select: { keyword: true, frequency: true },
  });
  const frequencyByKeyword = new Map(
    rows.map((r) => [r.keyword.toLowerCase(), r.frequency])
  );

  const weights = new Map<string, number>();
  for (const keyword of unique) {
    const frequency = frequencyByKeyword.get(keyword) ?? 1;
    const weight = clamp(2 / Math.log2(frequency + 2), 0.3, 3);
    weights.set(keyword, weight);
  }
  return weights;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resumeProfileToKeywordHits(
  profile: ExtractedResumeProfile
): KeywordHit[] {
  return [
    ...profile.skills.map((keyword) => ({ keyword, category: "skill" as const })),
    ...profile.roles.map((keyword) => ({ keyword, category: "role" as const })),
    ...profile.industries.map((keyword) => ({ keyword, category: "industry" as const })),
    ...profile.certifications.map((keyword) => ({
      keyword,
      category: "certification" as const,
    })),
  ];
}

export function jdProfileToKeywordHits(jd: ExtractedJDProfile): KeywordHit[] {
  return [
    ...jd.requiredSkills.map((keyword) => ({ keyword, category: "skill" as const })),
    ...jd.preferredSkills.map((keyword) => ({ keyword, category: "skill" as const })),
    ...jd.certificationsRequired.map((keyword) => ({
      keyword,
      category: "certification" as const,
    })),
    ...jd.domainKeywords.map((keyword) => ({ keyword, category: "industry" as const })),
  ];
}

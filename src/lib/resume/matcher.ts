import {
  MatchCandidateInput,
  MatchClassification,
  MatchFactorResult,
  MatchJDInput,
  MatchResult,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Weights sum to 100. This is the crux of "not just keyword matching" —
// mandatory skills dominate, but experience fit, role relevance,
// certifications, domain background, and location/work-model each pull
// weight too, so a candidate can't max the score on skills alone.
const WEIGHTS = {
  mandatorySkills: 30,
  preferredSkills: 8,
  totalExperience: 15,
  relevantExperience: 10,
  jobRoleRelevance: 12,
  certifications: 10,
  domainExperience: 8,
  locationWorkModel: 7,
};

function computeExperienceScore(
  candidateYears: number | null,
  minYears: number | null,
  maxYears: number | null
): number {
  if (minYears === null && maxYears === null) return 100;
  const years = candidateYears ?? 0;
  if (minYears !== null && years < minYears) {
    if (minYears === 0) return 100;
    return clamp((years / minYears) * 100, 0, 100);
  }
  if (maxYears !== null && years > maxYears * 1.5) {
    return 85; // significantly overqualified — still a strong candidate
  }
  return 100;
}

function scoreMandatorySkills(
  candidateKeywords: Set<string>,
  requiredSkills: string[],
  weights: Map<string, number>
): MatchFactorResult {
  const weight = WEIGHTS.mandatorySkills;
  if (requiredSkills.length === 0) {
    return { score: 100, weight, matched: [], missing: [], note: "JD did not list mandatory skills." };
  }
  const matched: string[] = [];
  const missing: string[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const skill of requiredSkills) {
    const w = weights.get(skill.toLowerCase()) ?? 1;
    totalWeight += w;
    if (candidateKeywords.has(skill.toLowerCase())) {
      matched.push(skill);
      matchedWeight += w;
    } else {
      missing.push(skill);
    }
  }
  const score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  const note =
    missing.length === 0
      ? `Matches all ${matched.length} mandatory skill(s).`
      : `Matches ${matched.length}/${requiredSkills.length} mandatory skill(s); missing ${missing.length}.`;
  return { score: round1(score), weight, matched, missing, note };
}

function scorePreferredSkills(
  candidateKeywords: Set<string>,
  preferredSkills: string[]
): MatchFactorResult {
  const weight = WEIGHTS.preferredSkills;
  if (preferredSkills.length === 0) {
    return { score: 100, weight, matched: [], missing: [], note: "JD did not list preferred skills." };
  }
  const matched = preferredSkills.filter((s) => candidateKeywords.has(s.toLowerCase()));
  const missing = preferredSkills.filter((s) => !candidateKeywords.has(s.toLowerCase()));
  const score = (matched.length / preferredSkills.length) * 100;
  const note =
    matched.length > 0
      ? `Has ${matched.length}/${preferredSkills.length} preferred/nice-to-have skill(s).`
      : "No preferred skills matched.";
  return { score: round1(score), weight, matched, missing, note };
}

function scoreTotalExperience(
  years: number | null,
  min: number | null,
  max: number | null
): MatchFactorResult {
  const weight = WEIGHTS.totalExperience;
  if (min === null && max === null) {
    return { score: 100, weight, matched: [], missing: [], note: "JD did not specify an experience range." };
  }
  const score = computeExperienceScore(years, min, max);
  const rangeLabel =
    min !== null && max !== null ? `${min}-${max} years` : min !== null ? `${min}+ years` : `up to ${max} years`;
  const displayYears = years ?? 0;
  const note =
    score >= 100
      ? `${displayYears} years of experience fits the required ${rangeLabel}.`
      : `${displayYears} years of experience is below the required ${rangeLabel}.`;
  return {
    score: round1(score),
    weight,
    matched: score >= 100 ? [`${displayYears} yrs experience`] : [],
    missing: score < 100 ? [`Requires ${rangeLabel} (candidate has ${displayYears})`] : [],
    note,
  };
}

function scoreRelevantExperience(
  years: number | null,
  relevantExperienceYears: number | null
): MatchFactorResult {
  const weight = WEIGHTS.relevantExperience;
  if (relevantExperienceYears === null) {
    return {
      score: 100,
      weight,
      matched: [],
      missing: [],
      note: "JD did not distinguish relevant experience from total experience.",
    };
  }
  const score = computeExperienceScore(years, relevantExperienceYears, null);
  const displayYears = years ?? 0;
  // Approximation: without deeper per-skill timeline parsing, total resume
  // experience is used as a proxy for "relevant" experience.
  const note =
    score >= 100
      ? `${displayYears} years meets the ${relevantExperienceYears}+ years of relevant experience required.`
      : `JD requires ${relevantExperienceYears}+ years of relevant experience; candidate's resume shows ${displayYears} years total (used as a proxy — verify relevance manually).`;
  return {
    score: round1(score),
    weight,
    matched: score >= 100 ? [`${displayYears} yrs`] : [],
    missing: score < 100 ? [`${relevantExperienceYears}+ yrs relevant experience`] : [],
    note,
  };
}

const ROLE_TOKEN_STOPWORDS = new Set(["the", "and", "for", "with", "of", "a", "an", "to", "in", "&", "-"]);

function scoreJobRoleRelevance(
  candidateRoles: string[],
  currentJobTitle: string | null | undefined,
  jdJobTitle: string | null,
  projects: string[] = []
): MatchFactorResult {
  const weight = WEIGHTS.jobRoleRelevance;
  if (!jdJobTitle) {
    return {
      score: 100,
      weight,
      matched: [],
      missing: [],
      note: "JD did not specify a job title to compare roles against.",
    };
  }
  const jdTokens = jdJobTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !ROLE_TOKEN_STOPWORDS.has(t));
  if (jdTokens.length === 0) {
    return {
      score: 100,
      weight,
      matched: [],
      missing: [],
      note: "JD job title had no comparable role keywords.",
    };
  }
  // Project bullet lines count toward role relevance too — a candidate whose
  // job titles don't literally say "Data Engineer" but whose project
  // descriptions show data-engineering work is real signal, not keyword
  // padding, since these lines come straight from the resume's own text.
  const roleText = [currentJobTitle || "", ...candidateRoles].join(" ").toLowerCase();
  const projectText = projects.join(" ").toLowerCase();
  const matchedInRole = jdTokens.filter((t) => roleText.includes(t));
  const matchedInProjects = jdTokens.filter((t) => !matchedInRole.includes(t) && projectText.includes(t));
  const matchedTokens = [...matchedInRole, ...matchedInProjects];
  const score = (matchedTokens.length / jdTokens.length) * 100;
  const note =
    matchedTokens.length === 0
      ? `No overlap found between candidate's role history/projects and the JD title "${jdJobTitle}".`
      : matchedInProjects.length > 0
        ? `Candidate's role history/projects overlap with "${jdJobTitle}" (${matchedInRole.join(", ") || "via project experience"}${matchedInProjects.length ? `; project evidence: ${matchedInProjects.join(", ")}` : ""}).`
        : `Candidate's role history overlaps with "${jdJobTitle}" (${matchedTokens.join(", ")}).`;
  return {
    score: round1(score),
    weight,
    matched: matchedTokens,
    missing: matchedTokens.length === 0 ? [jdJobTitle] : [],
    note,
  };
}

function scoreCertifications(
  candidateCerts: string[],
  requiredCerts: string[]
): MatchFactorResult {
  const weight = WEIGHTS.certifications;
  if (requiredCerts.length === 0) {
    return { score: 100, weight, matched: [], missing: [], note: "JD did not require specific certifications." };
  }
  const candidateCertSet = new Set(candidateCerts.map((c) => c.toLowerCase()));
  const matched = requiredCerts.filter((c) => candidateCertSet.has(c.toLowerCase()));
  const missing = requiredCerts.filter((c) => !candidateCertSet.has(c.toLowerCase()));
  const score = (matched.length / requiredCerts.length) * 100;
  const note =
    missing.length === 0
      ? "Holds all required certification(s)."
      : `Missing ${missing.length} required certification(s).`;
  return { score: round1(score), weight, matched, missing, note };
}

function scoreDomainExperience(
  candidateIndustries: string[],
  domainKeywords: string[]
): MatchFactorResult {
  const weight = WEIGHTS.domainExperience;
  if (domainKeywords.length === 0) {
    return {
      score: 100,
      weight,
      matched: [],
      missing: [],
      note: "JD did not specify a target industry/domain.",
    };
  }
  const candidateSet = new Set(candidateIndustries.map((i) => i.toLowerCase()));
  const matched = domainKeywords.filter((d) => candidateSet.has(d.toLowerCase()));
  const missing = domainKeywords.filter((d) => !candidateSet.has(d.toLowerCase()));
  // No exact domain match doesn't disqualify — skills often transfer across
  // industries — so 50 is a floor, not a hard gate. But it's no longer
  // binary: matching some-of-several target domains scores between the
  // floor and 100 proportionally, instead of any-match-at-all maxing it out.
  const matchRatio = domainKeywords.length > 0 ? matched.length / domainKeywords.length : 0;
  const score = matched.length > 0 ? 60 + matchRatio * 40 : 50;
  const note =
    matched.length === domainKeywords.length
      ? `Has experience in all of the JD's target domain(s) (${matched.join(", ")}).`
      : matched.length > 0
        ? `Has experience in ${matched.length}/${domainKeywords.length} of the JD's target domain(s) (${matched.join(", ")}); no direct experience found in ${missing.join(", ")}.`
        : `No direct experience found in the JD's target domain(s) (${domainKeywords.join(", ")}).`;
  return { score: round1(score), weight, matched, missing, note };
}

function scoreLocationWorkModel(
  candidateLocation: string | null | undefined,
  willingToRelocate: boolean | undefined,
  jdLocation: string | null,
  jdWorkModel: string | null
): MatchFactorResult {
  const weight = WEIGHTS.locationWorkModel;
  if (!jdLocation && !jdWorkModel) {
    return {
      score: 100,
      weight,
      matched: [],
      missing: [],
      note: "JD did not specify a location or work model requirement.",
    };
  }
  if (jdWorkModel && jdWorkModel.toLowerCase() === "remote") {
    return {
      score: 100,
      weight,
      matched: ["Remote role — location independent"],
      missing: [],
      note: "Role is remote, so candidate location is not a constraint.",
    };
  }
  if (!jdLocation) {
    return {
      score: 100,
      weight,
      matched: [],
      missing: [],
      note: `Role is ${jdWorkModel}; no specific location constraint given.`,
    };
  }
  if (!candidateLocation) {
    return {
      score: 70,
      weight,
      matched: [],
      missing: [`Candidate location unknown; JD requires ${jdLocation}`],
      note: "Candidate location is not on file, so this can't be confirmed.",
    };
  }
  const isMatch =
    candidateLocation.toLowerCase().includes(jdLocation.toLowerCase()) ||
    jdLocation.toLowerCase().includes(candidateLocation.toLowerCase());
  if (isMatch) {
    return {
      score: 100,
      weight,
      matched: [candidateLocation],
      missing: [],
      note: `Candidate is based in ${candidateLocation}, matching the JD's ${jdLocation} requirement.`,
    };
  }
  if (willingToRelocate) {
    return {
      score: 80,
      weight,
      matched: [],
      missing: [],
      note: `Candidate is in ${candidateLocation} but has indicated willingness to relocate (JD requires ${jdLocation}).`,
    };
  }
  return {
    score: 40,
    weight,
    matched: [],
    missing: [`Candidate is in ${candidateLocation}; JD requires ${jdLocation}`],
    note: `Location mismatch: candidate is in ${candidateLocation}, JD requires ${jdLocation}, and relocation willingness is not indicated.`,
  };
}

// Finds a short verbatim excerpt in the resume's raw text for each given
// term, so the "why matched" view can show real evidence instead of just
// restating the keyword it already listed. Case-insensitive substring
// search with a ~90-char context window; terms with no textual occurrence
// (e.g. matched via a synonym in the keyword dictionary rather than a
// literal substring) are simply omitted — never fabricated.
export function buildEvidence(extractedText: string, terms: string[]): Record<string, string> {
  const evidence: Record<string, string> = {};
  if (!extractedText) return evidence;
  const lowerText = extractedText.toLowerCase();
  const CONTEXT = 45;
  for (const term of terms) {
    if (!term || evidence[term]) continue;
    const idx = lowerText.indexOf(term.toLowerCase());
    if (idx === -1) continue;
    const start = Math.max(0, idx - CONTEXT);
    const end = Math.min(extractedText.length, idx + term.length + CONTEXT);
    const snippet = extractedText.slice(start, end).replace(/\s+/g, " ").trim();
    evidence[term] = `${start > 0 ? "…" : ""}${snippet}${end < extractedText.length ? "…" : ""}`;
  }
  return evidence;
}

function classify(score: number): MatchClassification {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "potential";
  return "below_threshold";
}

const RECOMMENDATION_TEMPLATES: Record<MatchClassification, string> = {
  excellent:
    "Excellent Match — meets nearly all mandatory requirements with strong relevant experience.",
  strong: "Strong Match — meets most mandatory requirements; review the noted gaps before proceeding.",
  potential:
    "Potential Match — meets baseline requirements but has notable gaps worth a closer look.",
  below_threshold:
    "Below the configured match threshold. This is a screening aid, not an automatic rejection — resume parsing can miss context, so a manual look is still worthwhile for borderline candidates.",
};

/**
 * Scores a candidate against a JD across 8 weighted factors (mandatory
 * skills, preferred skills, total experience, relevant experience, job-role
 * relevance, certifications, domain experience, location/work model) so the
 * result isn't just a keyword-overlap count. Every factor carries its own
 * matched/missing detail and a human-readable note, which feed the
 * strengths/gaps/recommendation used by the "why matched" detail view — the
 * score alone should never be treated as an auto-reject signal.
 */
export function computeMatchScore(
  candidate: MatchCandidateInput,
  jd: MatchJDInput,
  keywordWeights: Map<string, number> = new Map()
): MatchResult {
  const candidateKeywordSet = new Set(candidate.keywords.map((k) => k.toLowerCase()));

  const factors = {
    mandatorySkills: scoreMandatorySkills(candidateKeywordSet, jd.requiredSkills, keywordWeights),
    preferredSkills: scorePreferredSkills(candidateKeywordSet, jd.preferredSkills),
    totalExperience: scoreTotalExperience(
      candidate.totalExperienceYears,
      jd.minExperienceYears,
      jd.maxExperienceYears
    ),
    relevantExperience: scoreRelevantExperience(
      candidate.totalExperienceYears,
      jd.relevantExperienceYears
    ),
    jobRoleRelevance: scoreJobRoleRelevance(candidate.roles, candidate.currentJobTitle, jd.jobTitle, candidate.projects),
    certifications: scoreCertifications(candidate.certifications, jd.certificationsRequired),
    domainExperience: scoreDomainExperience(candidate.industries, jd.domainKeywords),
    locationWorkModel: scoreLocationWorkModel(
      candidate.currentLocation,
      candidate.willingToRelocate,
      jd.location,
      jd.workModel
    ),
  };

  const totalWeight = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
  const overallScore = clamp(
    Object.values(factors).reduce((sum, f) => sum + (f.score * f.weight) / totalWeight, 0),
    0,
    100
  );

  const strengths: string[] = [];
  const gaps: string[] = [];
  for (const factor of Object.values(factors)) {
    if (factor.matched.length > 0) strengths.push(factor.note);
    if (factor.missing.length > 0) gaps.push(factor.note);
  }

  const classification = classify(overallScore);

  return {
    overallScore: round1(overallScore),
    classification,
    factors,
    matchedSkills: factors.mandatorySkills.matched,
    missingSkills: factors.mandatorySkills.missing,
    matchedPreferredSkills: factors.preferredSkills.matched,
    strengths,
    gaps,
    recommendation: RECOMMENDATION_TEMPLATES[classification],
    // Populated by service.ts (buildEvidence), which has the resume's raw
    // extracted text; matcher.ts itself only sees keyword lists.
    evidence: {},
  };
}

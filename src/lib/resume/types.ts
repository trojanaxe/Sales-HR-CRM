export interface EducationEntry {
  degree: string;
  institution?: string;
  year?: string;
}

export interface ExtractedResumeProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  technologies: string[];
  roles: string[];
  industries: string[];
  certifications: string[];
  education: EducationEntry[];
  projects: string[];
  totalExperienceYears: number | null;
  keywords: string[];
  currentJobTitle: string | null;
  companies: string[];
  noticePeriod: string | null;
  currentCTC: string | null;
  expectedCTC: string | null;
  location: string | null;
}

export interface ExtractedJDProfile {
  jobTitle: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  certificationsRequired: string[];
  domainKeywords: string[];
  keywords: string[];
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  relevantExperienceYears: number | null;
  location: string | null;
  workModel: string | null;
  employmentType: string | null;
  educationRequirement: string | null;
}

export interface MatchFactorResult {
  score: number;
  weight: number;
  matched: string[];
  missing: string[];
  note: string;
}

export type MatchClassification = "excellent" | "strong" | "potential" | "below_threshold";

export interface MatchResult {
  overallScore: number;
  classification: MatchClassification;
  factors: {
    mandatorySkills: MatchFactorResult;
    preferredSkills: MatchFactorResult;
    totalExperience: MatchFactorResult;
    relevantExperience: MatchFactorResult;
    jobRoleRelevance: MatchFactorResult;
    certifications: MatchFactorResult;
    domainExperience: MatchFactorResult;
    locationWorkModel: MatchFactorResult;
  };
  // Flattened for convenience / backward-compatible table display.
  matchedSkills: string[];
  missingSkills: string[];
  matchedPreferredSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: string;
  // Short verbatim excerpts from the resume text showing where a matched
  // term actually appears, keyed by the matched term — added so "why
  // matched" isn't just a bare keyword list (Part 8: "show the evidence
  // used from the resume wherever possible"). Populated by service.ts,
  // which has the resume's extractedText; matcher.ts stays pure/testable
  // without needing raw text.
  evidence: Record<string, string>;
}

export interface MatchCandidateInput {
  keywords: string[];
  totalExperienceYears: number | null;
  roles: string[];
  certifications: string[];
  industries: string[];
  currentJobTitle?: string | null;
  currentLocation?: string | null;
  willingToRelocate?: boolean;
  // Project bullet lines from the resume (ResumeProfile.projects) — folded
  // into job-role relevance so real project work counts toward role fit,
  // not just past job titles.
  projects?: string[];
}

export interface MatchJDInput {
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  relevantExperienceYears: number | null;
  jobTitle: string | null;
  certificationsRequired: string[];
  domainKeywords: string[];
  location: string | null;
  workModel: string | null;
}

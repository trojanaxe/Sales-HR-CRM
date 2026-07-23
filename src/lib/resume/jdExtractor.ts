import { KeywordCategory } from "./dictionary";
import {
  extractEducationRequirement,
  extractEmploymentType,
  extractJobTitle,
  extractLocation,
  extractRelevantExperienceYears,
  extractWorkModel,
  findDictionaryMatches,
  splitIntoSections,
  splitTokens,
  type SectionMatcher,
} from "./textUtils";
import { ExtractedJDProfile } from "./types";

const SECTION_MATCHERS: SectionMatcher[] = [
  {
    key: "required",
    pattern: /^(required\s+skills?|requirements?|must[-\s]?haves?|qualifications?|minimum\s+qualifications?)\s*:?\s*$/i,
  },
  {
    key: "preferred",
    pattern: /^(preferred\s+skills?|nice[-\s]?to[-\s]?haves?|good\s+to\s+haves?|bonus\s+points?)\s*:?\s*$/i,
  },
];

const RANGE_EXPERIENCE_PATTERN = /(\d+)\s*(?:-|to|–)\s*(\d+)\s*\+?\s*years?/i;
const MIN_PLUS_EXPERIENCE_PATTERN = /(\d+)\s*\+\s*years?/i;
const MIN_ONLY_EXPERIENCE_PATTERN =
  /(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d+)\s*years?/i;

function extractExperienceRange(text: string): {
  min: number | null;
  max: number | null;
} {
  const range = text.match(RANGE_EXPERIENCE_PATTERN);
  if (range) {
    return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  }
  const plus = text.match(MIN_PLUS_EXPERIENCE_PATTERN);
  if (plus) {
    return { min: parseInt(plus[1], 10), max: null };
  }
  const minOnly = text.match(MIN_ONLY_EXPERIENCE_PATTERN);
  if (minOnly) {
    return { min: parseInt(minOnly[1], 10), max: null };
  }
  return { min: null, max: null };
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return Array.from(seen.values());
}

export function parseJDText(
  text: string,
  dictionary: Record<KeywordCategory, string[]>
): ExtractedJDProfile {
  const sections = splitIntoSections(text, SECTION_MATCHERS);

  const explicitRequired = splitTokens(sections.required || "");
  const explicitPreferred = splitTokens(sections.preferred || "");

  // Skills/roles are bucketed into required vs preferred; certifications and
  // industries get their own dedicated fields instead of leaking into the
  // generic skill lists.
  const skillAndRoleTerms = [...dictionary.skill, ...dictionary.role];

  const dictionaryMatches = findDictionaryMatches(text, skillAndRoleTerms);
  const dictionaryRequired = sections.required
    ? findDictionaryMatches(sections.required, skillAndRoleTerms)
    : [];
  const dictionaryPreferred = sections.preferred
    ? findDictionaryMatches(sections.preferred, skillAndRoleTerms)
    : [];

  // Anything mentioned in the JD but not explicitly bucketed into a
  // required/preferred section still counts as required — most JDs list
  // skills as a flat block without a "must-have" header.
  const bucketed = new Set(
    [...explicitRequired, ...explicitPreferred, ...dictionaryRequired, ...dictionaryPreferred].map(
      (s) => s.toLowerCase()
    )
  );
  const unbucketed = dictionaryMatches.filter((m) => !bucketed.has(m.toLowerCase()));

  const requiredSkills = dedupeCaseInsensitive([
    ...explicitRequired,
    ...dictionaryRequired,
    ...unbucketed,
  ]);
  const preferredSkills = dedupeCaseInsensitive([
    ...explicitPreferred,
    ...dictionaryPreferred,
  ]).filter((s) => !requiredSkills.some((r) => r.toLowerCase() === s.toLowerCase()));

  const certificationsRequired = dedupeCaseInsensitive(
    findDictionaryMatches(text, dictionary.certification)
  );
  const domainKeywords = dedupeCaseInsensitive(
    findDictionaryMatches(text, dictionary.industry)
  );

  const keywords = dedupeCaseInsensitive([
    ...requiredSkills,
    ...preferredSkills,
    ...certificationsRequired,
  ]).map((k) => k.toLowerCase());

  const { min, max } = extractExperienceRange(text);

  return {
    jobTitle: extractJobTitle(text),
    requiredSkills,
    preferredSkills,
    certificationsRequired,
    domainKeywords,
    keywords: dedupeCaseInsensitive(keywords),
    minExperienceYears: min,
    maxExperienceYears: max,
    relevantExperienceYears: extractRelevantExperienceYears(text),
    location: extractLocation(text),
    workModel: extractWorkModel(text),
    employmentType: extractEmploymentType(text),
    educationRequirement: extractEducationRequirement(text),
  };
}

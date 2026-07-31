import { KeywordCategory } from "./dictionary";
import {
  extractCompanies,
  extractCurrentCTC,
  extractCurrentJobTitle,
  extractEducationEntries,
  extractEmail,
  extractExpectedCTC,
  extractLocation,
  extractName,
  extractNoticePeriod,
  extractPhone,
  estimateTotalExperienceYears,
  findDictionaryMatches,
  splitIntoSections,
  splitTokens,
  type SectionMatcher,
} from "./textUtils";
import { ExtractedResumeProfile } from "./types";

const SECTION_MATCHERS: SectionMatcher[] = [
  { key: "skills", pattern: /^(technical\s+|key\s+|core\s+)?skills?(\s*(&|and)\s*\w+)?\s*:?\s*$/i },
  { key: "skills", pattern: /^core\s+competenc(y|ies)\s*:?\s*$/i },
  { key: "certifications", pattern: /^(licenses?\s*(&|and)\s*)?certifications?\s*:?\s*$/i },
  { key: "education", pattern: /^(education|academic\s+qualifications?|educational\s+background)\s*:?\s*$/i },
  { key: "experience", pattern: /^(work\s+|professional\s+)?experience\s*:?\s*$/i },
  { key: "experience", pattern: /^(employment|career)\s+history\s*:?\s*$/i },
  { key: "projects", pattern: /^(key\s+)?projects?\s*:?\s*$/i },
];

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return Array.from(seen.values());
}

export function parseResumeText(
  text: string,
  dictionary: Record<KeywordCategory, string[]>
): ExtractedResumeProfile {
  const sections = splitIntoSections(text, SECTION_MATCHERS);

  const explicitSkills = splitTokens(sections.skills || "");
  const explicitCertifications = splitTokens(sections.certifications || "");

  const dictionarySkills = findDictionaryMatches(text, dictionary.skill);
  const dictionaryRoles = findDictionaryMatches(text, dictionary.role);
  const dictionaryIndustries = findDictionaryMatches(text, dictionary.industry);
  const dictionaryCertifications = findDictionaryMatches(text, dictionary.certification);

  const skills = dedupeCaseInsensitive([...explicitSkills, ...dictionarySkills]);
  const technologies = dedupeCaseInsensitive(dictionarySkills);
  const roles = dedupeCaseInsensitive(dictionaryRoles);
  const industries = dedupeCaseInsensitive(dictionaryIndustries);
  const certifications = dedupeCaseInsensitive([
    ...explicitCertifications,
    ...dictionaryCertifications,
  ]);

  const education = extractEducationEntries(sections.education || text);

  const projects = (sections.projects || "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•·]+\s*/, ""))
    .filter((l) => l.length >= 3 && l.length <= 200)
    .slice(0, 20);

  const keywords = dedupeCaseInsensitive([
    ...skills,
    ...technologies,
    ...roles,
    ...industries,
    ...certifications,
  ]).map((k) => k.toLowerCase());

  const experienceSection = sections.experience || "";

  return {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills,
    technologies,
    roles,
    industries,
    certifications,
    education,
    projects,
    totalExperienceYears: estimateTotalExperienceYears(text),
    keywords: dedupeCaseInsensitive(keywords),
    currentJobTitle: extractCurrentJobTitle(experienceSection, dictionary.role),
    companies: extractCompanies(experienceSection, dictionary.role),
    noticePeriod: extractNoticePeriod(text),
    currentCTC: extractCurrentCTC(text),
    expectedCTC: extractExpectedCTC(text),
    location: extractLocation(text),
  };
}

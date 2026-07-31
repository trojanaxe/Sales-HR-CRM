import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResumeText } from "./profileExtractor";
import { seedDictionary } from "./dictionary";

const SAMPLE_RESUME = `Jane Doe
jane.doe@example.com
+1 415-555-0182

Skills:
React, Node.js, PostgreSQL, Docker, AWS

Certifications:
AWS Certified Solutions Architect

Experience:
Senior Software Engineer, Acme Corp, 2018 - Present
Software Engineer, Beta Inc, 2015 - 2018

Education:
B.Tech in Computer Science, State University, 2015

Projects:
Built a real-time analytics dashboard using React and PostgreSQL
Migrated legacy monolith to Kubernetes-based microservices
`;

test("parseResumeText extracts contact info", () => {
  const profile = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.equal(profile.name, "Jane Doe");
  assert.equal(profile.email, "jane.doe@example.com");
  assert.equal(profile.phone, "+1 415-555-0182");
});

test("parseResumeText extracts explicit and dictionary-matched skills", () => {
  const profile = parseResumeText(SAMPLE_RESUME, seedDictionary());
  const lower = profile.skills.map((s) => s.toLowerCase());
  assert.ok(lower.includes("react"));
  assert.ok(lower.includes("node.js"));
  assert.ok(lower.includes("postgresql"));
  assert.ok(lower.includes("docker"));
  assert.ok(lower.includes("aws"));
});

test("parseResumeText extracts certifications and education", () => {
  const profile = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.ok(
    profile.certifications.some((c) => c.toLowerCase().includes("aws certified solutions architect"))
  );
  assert.equal(profile.education.length, 1);
  assert.match(profile.education[0].degree, /B\.?\s?Tech/i);
  assert.equal(profile.education[0].year, "2015");
});

test("parseResumeText estimates total experience from date ranges", () => {
  const profile = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.ok(profile.totalExperienceYears !== null && profile.totalExperienceYears >= 6);
});

test("parseResumeText builds a lowercased keyword union", () => {
  const profile = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.ok(profile.keywords.includes("react"));
  assert.ok(profile.keywords.every((k) => k === k.toLowerCase()));
});

test("parseResumeText extracts the most recent job title and companies", () => {
  const profile = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.equal(profile.currentJobTitle, "Senior Software Engineer");
  assert.ok(profile.companies.some((c) => c.includes("Acme Corp")));
});

test("parseResumeText only extracts CTC/notice period when explicitly labeled", () => {
  const withLabels = parseResumeText(
    SAMPLE_RESUME + "\nNotice Period: 30 days\nCurrent CTC: 12 LPA\nExpected CTC: 16 LPA\n",
    seedDictionary()
  );
  assert.equal(withLabels.noticePeriod, "30 days");
  assert.equal(withLabels.currentCTC, "12 LPA");
  assert.equal(withLabels.expectedCTC, "16 LPA");

  const withoutLabels = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.equal(withoutLabels.noticePeriod, null);
  assert.equal(withoutLabels.currentCTC, null);
  assert.equal(withoutLabels.expectedCTC, null);
});

test("parseResumeText only extracts location when explicitly labeled (never fabricated)", () => {
  const withLabel = parseResumeText(SAMPLE_RESUME + "\nLocation: Bangalore, India\n", seedDictionary());
  assert.equal(withLabel.location, "Bangalore, India");

  const withoutLabel = parseResumeText(SAMPLE_RESUME, seedDictionary());
  assert.equal(withoutLabel.location, null);
});

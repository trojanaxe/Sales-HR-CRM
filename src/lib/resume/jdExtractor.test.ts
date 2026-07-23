import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJDText } from "./jdExtractor";
import { seedDictionary } from "./dictionary";

const SAMPLE_JD = `Senior Full Stack Engineer

We are looking for an experienced engineer with 5-8 years of experience.

Required Skills:
React, Node.js, PostgreSQL, AWS

Preferred Skills:
Docker, Kubernetes
`;

test("parseJDText separates required and preferred skills", () => {
  const jd = parseJDText(SAMPLE_JD, seedDictionary());
  const requiredLower = jd.requiredSkills.map((s) => s.toLowerCase());
  const preferredLower = jd.preferredSkills.map((s) => s.toLowerCase());

  assert.ok(requiredLower.includes("react"));
  assert.ok(requiredLower.includes("postgresql"));
  assert.ok(preferredLower.includes("docker"));
  assert.ok(preferredLower.includes("kubernetes"));
  // Preferred skills should not also appear in required.
  assert.ok(!requiredLower.includes("docker"));
});

test("parseJDText extracts an experience range", () => {
  const jd = parseJDText(SAMPLE_JD, seedDictionary());
  assert.equal(jd.minExperienceYears, 5);
  assert.equal(jd.maxExperienceYears, 8);
});

test("parseJDText handles a JD with no explicit skill sections", () => {
  const jd = parseJDText(
    "We need a Python and Django developer with 3+ years experience in AWS.",
    seedDictionary()
  );
  const lower = jd.requiredSkills.map((s) => s.toLowerCase());
  assert.ok(lower.includes("python"));
  assert.ok(lower.includes("django"));
  assert.ok(lower.includes("aws"));
  assert.equal(jd.minExperienceYears, 3);
  assert.equal(jd.maxExperienceYears, null);
});

test("parseJDText separates certifications and domain keywords from generic skills", () => {
  const jd = parseJDText(
    "Senior Salesforce Developer\n\nRequired Skills:\nApex, Visualforce\n\nMust hold Salesforce Certified Administrator. Experience in Healthcare is a plus.",
    seedDictionary()
  );
  const requiredLower = jd.requiredSkills.map((s) => s.toLowerCase());
  assert.ok(requiredLower.includes("apex"));
  assert.ok(!requiredLower.includes("salesforce certified administrator"));
  assert.ok(jd.certificationsRequired.some((c) => c.toLowerCase().includes("salesforce certified administrator")));
  assert.ok(jd.domainKeywords.some((d) => d.toLowerCase() === "healthcare"));
});

test("parseJDText extracts job title, location, work model, and employment type", () => {
  const jd = parseJDText(
    "Senior Full Stack Engineer\n\nLocation: Austin, TX\nThis is a remote, full-time role.",
    seedDictionary()
  );
  assert.equal(jd.jobTitle, "Senior Full Stack Engineer");
  assert.equal(jd.location, "Austin, TX");
  assert.equal(jd.workModel, "Remote");
  assert.equal(jd.employmentType, "Full-time");
});

test("parseJDText distinguishes relevant experience from total experience", () => {
  const jd = parseJDText(
    "5+ years of relevant experience in distributed systems required.",
    seedDictionary()
  );
  assert.equal(jd.relevantExperienceYears, 5);
});

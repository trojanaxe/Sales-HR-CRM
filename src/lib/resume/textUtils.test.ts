import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estimateTotalExperienceYears,
  extractCompanies,
  extractCurrentCTC,
  extractCurrentJobTitle,
  extractEducationRequirement,
  extractEmail,
  extractEmploymentType,
  extractExpectedCTC,
  extractJobTitle,
  extractLocation,
  extractName,
  extractNoticePeriod,
  extractPhone,
  extractRelevantExperienceYears,
  extractWorkModel,
  findDictionaryMatches,
  splitTokens,
} from "./textUtils";

test("findDictionaryMatches matches special-character terms with boundaries", () => {
  const matches = findDictionaryMatches(
    "Experience with C++, C#, and .NET. Also aware of Objective-Cpp.",
    ["C++", "C#", ".NET", "Java"]
  );
  assert.deepEqual(new Set(matches), new Set(["C++", "C#", ".NET"]));
});

test("findDictionaryMatches does not match substrings inside longer words", () => {
  const matches = findDictionaryMatches("JavaScript developer", ["Java"]);
  assert.deepEqual(matches, []);
});

test("splitTokens splits comma/semicolon/bullet separated lists", () => {
  const tokens = splitTokens("React, Node.js; PostgreSQL\n- Docker\n- Kubernetes");
  assert.deepEqual(tokens, ["React", "Node.js", "PostgreSQL", "Docker", "Kubernetes"]);
});

test("estimateTotalExperienceYears picks up explicit 'X years of experience'", () => {
  const years = estimateTotalExperienceYears("I have 7 years of experience in software engineering.");
  assert.equal(years, 7);
});

test("estimateTotalExperienceYears derives span from date ranges when no explicit mention exists", () => {
  const years = estimateTotalExperienceYears(
    "Software Engineer, Acme Corp, 2015 - 2019\nSenior Engineer, Beta Inc, 2019 - Present"
  );
  assert.ok(years !== null && years >= 6);
});

test("extractEmail finds a standard email address", () => {
  assert.equal(extractEmail("Contact: jane.doe@example.com"), "jane.doe@example.com");
});

test("extractPhone finds a phone number", () => {
  assert.equal(extractPhone("Phone: +1 415-555-0182"), "+1 415-555-0182");
});

test("extractName returns the first plausible line, skipping emails", () => {
  assert.equal(extractName("Jane Doe\njane.doe@example.com\n123-456-7890"), "Jane Doe");
});

test("extractNoticePeriod only matches an explicit label", () => {
  assert.equal(extractNoticePeriod("Notice Period: 30 days"), "30 days");
  assert.equal(extractNoticePeriod("Available immediately, no mention of notice"), null);
});

test("extractCurrentCTC and extractExpectedCTC match explicit labels", () => {
  assert.equal(extractCurrentCTC("Current CTC: 12 LPA"), "12 LPA");
  assert.equal(extractExpectedCTC("Expected Salary - $95k"), "$95k");
  assert.equal(extractCurrentCTC("No salary info here"), null);
});

test("extractCurrentJobTitle finds a role keyword in the first lines of the experience section", () => {
  const section = "Senior Software Engineer, Acme Corp, 2020 - Present\nSoftware Engineer, Beta Inc, 2017 - 2020";
  const title = extractCurrentJobTitle(section, ["Senior Software Engineer", "Software Engineer"]);
  assert.equal(title, "Senior Software Engineer");
});

test("extractCompanies picks up '<Title> at <Company>' and comma-separated lines", () => {
  const section = "Senior Software Engineer at Acme Corp\nSoftware Engineer, Beta Inc, 2017 - 2020";
  const companies = extractCompanies(section, ["Senior Software Engineer", "Software Engineer"]);
  assert.ok(companies.includes("Acme Corp"));
  assert.ok(companies.includes("Beta Inc"));
});

test("extractWorkModel and extractEmploymentType recognize common terms", () => {
  assert.equal(extractWorkModel("This is a fully remote position."), "Remote");
  assert.equal(extractWorkModel("Hybrid work model, 3 days in office."), "Hybrid");
  assert.equal(extractWorkModel("No mention of work arrangement."), null);
  assert.equal(extractEmploymentType("This is a full-time role."), "Full-time");
  assert.equal(extractEmploymentType("Contract-to-hire opportunity."), "Contract-to-Hire");
});

test("extractLocation and extractJobTitle use explicit labels first", () => {
  assert.equal(extractLocation("Location: Austin, TX"), "Austin, TX");
  assert.equal(extractJobTitle("Job Title: Senior Full Stack Engineer\n\nWe are hiring..."), "Senior Full Stack Engineer");
  assert.equal(extractJobTitle("Senior Full Stack Engineer\n\nWe are hiring..."), "Senior Full Stack Engineer");
});

test("extractEducationRequirement finds a degree-mention line", () => {
  const req = extractEducationRequirement("Requirements:\nBachelor's degree in Computer Science required.\n5+ years experience.");
  assert.match(req || "", /Bachelor'?s? degree/i);
});

test("extractRelevantExperienceYears distinguishes relevant from total experience", () => {
  assert.equal(
    extractRelevantExperienceYears("5+ years of relevant experience in cloud infrastructure required."),
    5
  );
  assert.equal(extractRelevantExperienceYears("5+ years of experience required."), null);
});

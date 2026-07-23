import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMatchScore, buildEvidence } from "./matcher";
import { MatchCandidateInput, MatchJDInput } from "./types";

const JD: MatchJDInput = {
  requiredSkills: ["React", "Node.js", "PostgreSQL"],
  preferredSkills: ["Docker"],
  minExperienceYears: 3,
  maxExperienceYears: 6,
  relevantExperienceYears: null,
  jobTitle: null,
  certificationsRequired: [],
  domainKeywords: [],
  location: null,
  workModel: null,
};

const BASE_CANDIDATE: MatchCandidateInput = {
  keywords: [],
  totalExperienceYears: 4,
  roles: [],
  certifications: [],
  industries: [],
};

test("computeMatchScore gives a perfect score for a fully matching candidate", () => {
  const result = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js", "postgresql", "docker"] },
    JD
  );
  assert.equal(result.overallScore, 100);
  assert.equal(result.classification, "excellent");
  assert.equal(result.missingSkills.length, 0);
  assert.deepEqual(result.matchedPreferredSkills, ["Docker"]);
});

test("computeMatchScore reports missing required skills", () => {
  const result = computeMatchScore({ ...BASE_CANDIDATE, keywords: ["react"] }, JD);
  assert.deepEqual(result.missingSkills, ["Node.js", "PostgreSQL"]);
  assert.ok(result.factors.mandatorySkills.score < 100 && result.factors.mandatorySkills.score > 0);
  assert.ok(result.gaps.length > 0);
});

test("computeMatchScore penalizes candidates below the minimum experience", () => {
  const belowMin = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js", "postgresql"], totalExperienceYears: 1 },
    JD
  );
  const atMin = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js", "postgresql"], totalExperienceYears: 3 },
    JD
  );
  assert.ok(belowMin.factors.totalExperience.score < atMin.factors.totalExperience.score);
});

test("computeMatchScore treats a JD with no experience/skill requirements as neutral", () => {
  const emptyJD: MatchJDInput = {
    requiredSkills: [],
    preferredSkills: [],
    minExperienceYears: null,
    maxExperienceYears: null,
    relevantExperienceYears: null,
    jobTitle: null,
    certificationsRequired: [],
    domainKeywords: [],
    location: null,
    workModel: null,
  };
  const result = computeMatchScore({ ...BASE_CANDIDATE, totalExperienceYears: null }, emptyJD);
  assert.equal(result.overallScore, 100);
  assert.equal(result.classification, "excellent");
});

test("computeMatchScore weights rarer skills more heavily than common ones", () => {
  const weights = new Map([
    ["react", 0.5],
    ["node.js", 0.5],
    ["postgresql", 2.5],
  ]);
  const missingCommon = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["postgresql"] },
    JD,
    weights
  );
  const missingRare = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js"] },
    JD,
    weights
  );
  assert.ok(missingRare.factors.mandatorySkills.score < missingCommon.factors.mandatorySkills.score);
});

test("computeMatchScore credits certifications only when the JD requires them", () => {
  const jdWithCert: MatchJDInput = { ...JD, certificationsRequired: ["PMP"] };
  const withCert = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js", "postgresql"], certifications: ["PMP"] },
    jdWithCert
  );
  const withoutCert = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js", "postgresql"], certifications: [] },
    jdWithCert
  );
  assert.equal(withCert.factors.certifications.score, 100);
  assert.equal(withoutCert.factors.certifications.score, 0);
  assert.ok(withCert.overallScore > withoutCert.overallScore);
});

test("computeMatchScore treats a remote JD as location-independent", () => {
  const remoteJD: MatchJDInput = { ...JD, location: "New York", workModel: "Remote" };
  const result = computeMatchScore(
    {
      ...BASE_CANDIDATE,
      keywords: ["react", "node.js", "postgresql"],
      currentLocation: "Austin",
      willingToRelocate: false,
    },
    remoteJD
  );
  assert.equal(result.factors.locationWorkModel.score, 100);
});

test("computeMatchScore penalizes an onsite location mismatch with no relocation willingness", () => {
  const onsiteJD: MatchJDInput = { ...JD, location: "New York", workModel: "Onsite" };
  const result = computeMatchScore(
    {
      ...BASE_CANDIDATE,
      keywords: ["react", "node.js", "postgresql"],
      currentLocation: "Austin",
      willingToRelocate: false,
    },
    onsiteJD
  );
  assert.ok(result.factors.locationWorkModel.score < 100);
});

test("computeMatchScore classification bands match the documented thresholds", () => {
  const perfect = computeMatchScore(
    { ...BASE_CANDIDATE, keywords: ["react", "node.js", "postgresql", "docker"] },
    JD
  );
  assert.equal(perfect.classification, "excellent");

  const poor = computeMatchScore({ ...BASE_CANDIDATE, keywords: [], totalExperienceYears: 0 }, JD);
  assert.equal(poor.classification, "below_threshold");
  // Below-threshold candidates still get a full explainable result, not a hard error.
  assert.ok(poor.recommendation.length > 0);
});

test("computeMatchScore scores domain experience proportionally, not as a binary any-match", () => {
  const jdTwoDomains: MatchJDInput = { ...JD, domainKeywords: ["Healthcare", "Finance"] };
  const noMatch = computeMatchScore({ ...BASE_CANDIDATE, industries: ["Retail"] }, jdTwoDomains);
  const oneMatch = computeMatchScore({ ...BASE_CANDIDATE, industries: ["Healthcare"] }, jdTwoDomains);
  const bothMatch = computeMatchScore({ ...BASE_CANDIDATE, industries: ["Healthcare", "Finance"] }, jdTwoDomains);
  assert.equal(noMatch.factors.domainExperience.score, 50);
  assert.ok(oneMatch.factors.domainExperience.score > 50 && oneMatch.factors.domainExperience.score < 100);
  assert.equal(bothMatch.factors.domainExperience.score, 100);
});

test("computeMatchScore credits job-role relevance from project experience, not just job titles", () => {
  const jdWithTitle: MatchJDInput = { ...JD, jobTitle: "Data Engineer" };
  const noProjectMatch = computeMatchScore({ ...BASE_CANDIDATE, currentJobTitle: "Backend Developer" }, jdWithTitle);
  const withProjectMatch = computeMatchScore(
    { ...BASE_CANDIDATE, currentJobTitle: "Backend Developer", projects: ["Built a data engineer pipeline for ETL workloads"] },
    jdWithTitle
  );
  assert.ok(withProjectMatch.factors.jobRoleRelevance.score > noProjectMatch.factors.jobRoleRelevance.score);
});

test("buildEvidence returns a real excerpt around a matched term and skips terms not found verbatim", () => {
  const text = "Experienced with React and Node.js in production for 4 years.";
  const evidence = buildEvidence(text, ["React", "Kubernetes"]);
  assert.ok(evidence["React"].toLowerCase().includes("react"));
  assert.equal(evidence["Kubernetes"], undefined);
});

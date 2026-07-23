# Feature: Resume Intelligence

## What it does
Turns uploaded resume/JD files into structured, matchable data:
1. Extracts text from resumes (PDF/DOCX) and JD files.
2. Parses that text into a structured profile (skills, technologies, roles,
   industries, certifications, education, projects, total experience years).
3. Grows a shared keyword dictionary from what it sees (the "candidate
   learning system") and uses keyword frequency to weight rarer skills higher
   when scoring matches.
4. Scores/ranks candidates against a requirement's JD (skill overlap +
   experience fit + preferred-skill bonus), surfacing missing-skill gaps.

Entirely dictionary/regex-based — no external LLM/NLP API, no new required
env vars or API keys. Deliberately scoped this way so it works offline and is
fully deterministic/unit-testable.

## Files added
- `src/lib/resume/dictionary.ts` — seed skill/role/industry/certification lists.
- `src/lib/resume/textUtils.ts` — pure text-parsing helpers (dictionary
  matching, section splitting, experience-year estimation, contact-info regex).
- `src/lib/resume/textExtract.ts` — PDF (pdf-parse v2) / DOCX (mammoth) → plain text.
- `src/lib/resume/profileExtractor.ts` — resume text → `ExtractedResumeProfile`.
- `src/lib/resume/jdExtractor.ts` — JD text → `ExtractedJDProfile`.
- `src/lib/resume/matcher.ts` — `computeMatchScore()`, pure scoring function.
- `src/lib/resume/learning.ts` — DB-backed dictionary growth + keyword
  frequency weighting (talks to `SkillKeyword` table).
- `src/lib/resume/service.ts` — orchestration: parse-and-persist for
  resumes/JDs, rank candidates for a requirement, score one candidate.
- `src/lib/resume/*.test.ts` — unit tests for the pure logic (21 tests,
  `npm test`, uses Node's built-in test runner via `tsx`).
- New API routes:
  - `POST /api/resumes/[id]/parse` — re-parse a resume (hr/admin).
  - `GET /api/candidates/[id]/profile` — fetch a candidate's parsed profile.
  - `GET /api/candidates/[id]/match?requirementId=` — score one candidate vs a JD.
  - `GET/POST /api/requirements/[id]/jd-profile` — fetch/re-parse a JD profile
    (POST is sales/admin, matching JD-upload permissions).
  - `GET /api/requirements/[id]/match` — ranked candidate list for a requirement.

## Files modified
- `prisma/schema.prisma` — added `ResumeProfile`, `JDProfile`, `SkillKeyword`
  models + `KeywordCategory` enum; back-relations on `Resume` and `Requirement`.
  Migration: `prisma/migrations/20260701104702_resume_intelligence/`.
- `src/app/api/candidates/[id]/resume/route.ts` — auto-parses the resume
  right after upload (best-effort; failures are logged, not fatal — the file
  is still stored and the upload still succeeds).
- `src/app/api/upload/jd/route.ts` — same auto-parse pattern for JDs.
- `src/components/candidates/CandidateDetail.tsx` — new "Resume Intelligence"
  card (technologies/roles/industries/certifications + detected experience)
  and a "Re-parse intelligence" button.
- `src/components/requirements/RequirementDetail.tsx` — new "Match Candidates"
  button + "Candidate Match Ranking" card (score % and missing-skill gaps per
  candidate).
- `package.json` — added `pdf-parse`, `mammoth` deps; `tsx` dev dep; `test` script.

## Architecture decisions
See `.agents/decisions.md` for the reasoning behind each choice; summary:
- Dictionary/regex extraction instead of an LLM (deterministic, offline, no
  new secrets, fully unit-testable).
- `Candidate.skills` gets unioned with extracted skills on every resume
  parse rather than replaced, so manually-entered skills are preserved.
- Matching weights rarer skills higher via `SkillKeyword.frequency`
  (inverse-frequency weighting) — this is the actual mechanism behind
  "the more resumes we see, the better matching gets."
- Auto-parse on upload is fire-and-forget (try/catch, logged) so a bad/legacy
  file never blocks the upload itself; manual re-parse endpoints exist for
  retries.

## Known limitations (acceptable for this iteration, not bugs)
- Legacy binary `.doc` is not supported (only `.pdf` and `.docx`) — no
  lightweight pure-JS parser exists for the old binary format. Uploads still
  succeed; parsing is just skipped with a clear 422 message if manually retried.
- Dictionary-based extraction can produce occasional false positives — e.g. a
  section header word that's also a seed industry term ("Education") can get
  picked up as an industry match from a whole-document scan. Acceptable
  precision/recall tradeoff for a non-LLM approach; a future iteration could
  restrict industry/role matching to specific sections only.
- `PMP` intentionally appears in both the skill and certification seed lists
  (people list it as either) — not a bug, just deliberate overlap.
- No pagination/cursor on `GET /api/requirements/[id]/match` beyond a `limit`
  query param (default 50, max 200) — fine at current candidate-pool scale.

## Verified working (manual smoke test during implementation)
Full pipeline exercised end-to-end against the local Postgres dev DB with
generated sample PDF/DOCX fixtures: candidate resume upload → auto-parse →
`ResumeProfile` created → `Candidate.skills`/`experience` synced → JD upload →
auto-parse → `JDProfile` created → `/match` ranking returns correct weighted
score with matched/missing skills. Confirmed visually via Playwright
screenshots of `CandidateDetail` (Resume Intelligence card) and
`RequirementDetail` (Candidate Match Ranking card). Also confirmed `.doc`
uploads succeed but skip parsing gracefully (422 on manual re-parse attempt).
Test data was cleaned up afterward; the pdf.js worker-path fix and page-break
marker stripping (see decisions.md) were found and fixed as a direct result
of this smoke test, not caught by unit tests alone.

## Update (2026-07-01): pasted JD text as a third JD source
Sales reps can now paste JD text directly into a textarea on
`RequirementForm.tsx` ("JD Text"), alongside the pre-existing "JD Link (URL)"
field (a file-upload option also exists via `/api/upload/jd` but has no
frontend wired to it yet — pre-existing gap, unrelated to this change).
- `Requirement.jdText String?` added to the schema (migration
  `20260701132638_requirement_jd_text`).
- `parseJDAndPersist()` in `service.ts` now sources JD text from
  `jdFilePath` if present, else falls back to `jdText` — the rest of the
  matching pipeline treats both identically.
- `POST /api/requirements` and `PATCH /api/requirements/[id]` validate
  `jdText` (max 20,000 chars) and auto-trigger JD parsing (best-effort,
  non-blocking) whenever it's set/changed.
- `RequirementDetail.tsx` shows pasted JD text in a collapsible "JD Text"
  section.
- Verified end-to-end against the live dev DB: creating a requirement with
  `jdText` auto-extracted required/preferred skills and produced correct
  ranked matches against real existing candidates in the database.

## Update (2026-07-03): Centralized Resume Database & JD Candidate Matching
Two new modules, both HR/Admin-only, both reusing the Resume Intelligence
pipeline above rather than duplicating it.

### Module 1 — Resume Database (`/resume-database`)
Lets HR/Admin bulk-upload resumes independent of any job opening, with
duplicate detection before a new candidate record is created.
- Schema additions: `Candidate`/`ResumeProfile` gained `currentJobTitle`,
  `companiesWorkedFor`/`companies`, `noticePeriod`, `currentCTC`,
  `expectedCTC`; `Candidate` also gained `sourceDetail` (freeform, e.g.
  "LinkedIn", a vendor name — the existing `source` enum stayed coarse).
  Migration: `prisma/migrations/20260703055231_resume_database_jd_matching/`.
- `src/lib/resume/duplicateDetection.ts` — `findDuplicateCandidates()`:
  exact email → normalized-phone (last 10 digits) → exact name → fuzzy-name
  confirmed by resume-keyword Jaccard similarity (≥0.5). Returns matches with
  their reason(s); empty array means safe to auto-create.
- `service.ts` gained `createCandidateFromResumeUpload()`: parses a raw
  buffer *before* touching the DB, dup-checks, and only creates/updates a
  candidate once resolved — see decisions.md for why nothing is persisted
  mid-flow when a duplicate is found.
- `POST /api/resumes/upload` — bulk (`resumes` FormData field, up to 50
  files), per-file independent result (`created`/`updated`/`duplicate`/
  `error`), optional `resolutions` JSON to resolve a previously-flagged
  duplicate by resubmitting that one file.
- `src/components/resume-database/ResumeDatabaseClient.tsx` — extended
  candidate table (title, notice period, CTC, source, uploaded by/when) +
  inline bulk-upload panel with per-file duplicate resolution UI.

### Module 2 — JD Candidate Matching (`/jd-matching`)
Paste/upload an ad-hoc JD (not tied to a `Requirement`) and rank the entire
resume database against it, filtered to a configurable minimum score.
- New `AdhocJD` model (own JD text/file + full extracted-JD field set,
  `createdById`-scoped: HR sees their own searches, Admin sees all).
- `JDProfile` (Requirement-scoped) gained the same richer extracted fields as
  `AdhocJD` so both share one code path: `jobTitle`, `location`, `workModel`,
  `employmentType`, `educationRequirement`, `certificationsRequired`,
  `domainKeywords`, `relevantExperienceYears`.
- New `MatchSettings` singleton model — admin-configurable `minMatchScore`
  (default 70), read by anyone, written by admin only.
- `matcher.ts` was rewritten from a 3-factor to an 8-factor weighted score
  (mandatory skills 30%, preferred 8%, total experience 15%, relevant
  experience 10%, job-role relevance 12%, certifications 10%, domain 8%,
  location/work-model 7%) with classification bands (Excellent ≥90 / Strong
  ≥80 / Potential ≥70 / Below Threshold <70, fixed regardless of the
  configurable list-visibility threshold) and templated `strengths`/`gaps`/
  `recommendation` text for the detailed match view. See decisions.md for
  the full "why 8 factors, why fixed bands" reasoning.
- API: `GET/POST /api/jd-matching` (list history / create+parse),
  `GET/DELETE /api/jd-matching/[id]`, `GET /api/jd-matching/[id]/results`
  (ranked + threshold-filtered, `?minScore=` overrides the configured
  default for one query without changing it).
- `src/components/jd-matching/JDMatchingClient.tsx` (search form + history)
  and `JDMatchingResults.tsx` (ranked table, expandable per-candidate
  "why matched" / "gaps" / per-factor score-breakdown view).
- `RequirementDetail.tsx`'s existing per-requirement match card got a
  classification badge but otherwise didn't need changes — `MatchResult`
  kept `matchedSkills`/`missingSkills`/`overallScore` at the top level for
  backward compatibility alongside the new `factors`/`strengths`/`gaps`.

### Bug found and fixed during this session's smoke testing
The keyword-learning system (`SkillKeyword` table) had no validation gate at
the point keywords get *recorded* — only at extraction time. A bad
extraction from an earlier test run had already been "learned" and kept
resurfacing in later parses even after the extraction-time bug was fixed and
the dev server restarted, because `loadDictionary()` merges learned keywords
back in and matches them directly, bypassing the (now-fixed) extractor
entirely. Fixed by adding `isLikelyValidKeyword()` (textUtils.ts) as a gate
in `recordKeywords()` (learning.ts) — full writeup in decisions.md. This is
the kind of bug that unit tests alone can't catch (they don't share
persistent state across runs the way the real dictionary does); only the
live smoke test surfaced it.

## Future improvements
- Restrict industry/role dictionary matching to relevant sections to reduce
  false positives from unrelated section headers.
- Add a background job/queue for parsing instead of inline fire-and-forget,
  if resume volume grows large enough that parse latency matters on upload.
- Surface a "Missing skills" call-to-action directly on the candidate's
  pipeline entry (currently only visible via the requirement's match list).
- Consider an optional LLM-assisted extraction pass behind a feature flag for
  resumes that score poorly on the deterministic extractor (e.g. very sparse
  keyword hits), while keeping the dictionary approach as the default/fallback.
- Admin tool to review/prune the `SkillKeyword` dictionary — some pre-existing
  entries from real historical resume uploads are noisy (section-header
  fragments like "Category", "Tools") but weren't touched this session since
  deleting real data wasn't this session's call to make (see decisions.md).
- "Job role relevance" and "relevant experience" factors are approximations
  (dictionary/title-token overlap and total-experience proxy, respectively) —
  true per-skill timeline parsing would sharpen both but needs either
  significantly more NLP heuristics or an LLM-assisted pass.

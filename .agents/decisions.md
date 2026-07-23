# Architecture Decisions Log

## Bug Fix Round: Edit forms, filters, submissions (2026-07-07)

### Root cause of "Candidate Edit" and "Requirement Edit" not saving: raw body spread into Prisma `update`
**Discovery:** Both `PATCH /api/candidates/[id]` and `PATCH /api/requirements/[id]` did
`data: { ...body, ... }`. Both edit forms (`CandidateForm`, `RequirementForm`) receive
their `existing` prop as the *full GET response* (owner, resumes, notes,
pipelineEntries, collaborators, sdr/assignedHR/contractMode/account/contact
objects, FK scalars like `sdrId`), which gets spread into form state and then
sent straight back on save. Prisma's checked `update` input rejects those
relation objects/FK scalars outright (`Unknown argument 'sdrId'...`), throwing
a 500 that both forms only ever displayed as generic "Failed" — so the bug
was invisible from the UI, only visible in the server log.
**Fix:** Both routes now build `data` from an explicit `EDITABLE_FIELDS`
allowlist instead of spreading `body`. This is the actual fix, not a
workaround — the allowlist is also cheap insurance against a client
accidentally overwriting `ownerId`/`sdrId`/etc. even if it wanted to.
**How to apply:** Any future PATCH route that hands the full GET-shaped
object back into an edit form must use the same allowlist pattern — never
spread `req.json()` result directly into a Prisma relation-aware `update`.

### Root cause of "Skills/Certification filter returns nothing": array containment isn't substring match
**Discovery:** `where.skills = { hasSome: [...] }` (Prisma's array-containment
filter) requires an *exact, case-sensitive* match against a stored array
element. Searching "Salesforce" could never match a stored "Salesforce CPQ",
and "salesforce" (lowercase) could never match stored "Salesforce" — the
filter wasn't buggy in the sense of wrong wiring, it was fundamentally the
wrong Prisma operator for "partial, case-insensitive" matching.
**Fix:** `src/lib/candidates/filters.ts` — a raw `$queryRaw` helper
(`candidateIdsMatchingArrayField`) that does `EXISTS (SELECT 1 FROM
unnest(column) elem WHERE elem ILIKE '%term%')`, returning matching ids that
get folded into the normal `where: { id: { in: ... } }` alongside every
other filter. Location/job-title/notice-period/source-detail filters were
already correct (`contains, mode: "insensitive"` on scalar columns) — the
real reason Location "didn't work" was that resume parsing never extracted
a location at all (see next entry), not a query bug.

### Resume parsing never extracted a candidate's location — added, label-only, same "never fabricate" convention
**Decision:** Added `extractLocation` (already existed for JD parsing) to
`parseResumeText`, a `ResumeProfile.location` column, and sync-on-parse onto
`Candidate.currentLocation` (only if blank — recruiter edits still win).
**Known limitation:** Still label-only ("Location: X") per this codebase's
established "never fabricate" rule for resume fields (notice period, CTC,
etc.) — a backfill re-parse of all 22 existing active resumes found 0 with
an explicit label, so most real-world resumes in this dataset won't get a
location until either the candidate record is edited manually or a resume
with an explicit label is uploaded. `scripts/backfill-resume-location.ts`
is kept for re-running if extraction improves later.

### Duplicate-submission prevention lives once, at `/api/pipeline` POST
**Decision:** Rather than checking "already submitted" separately in
`SubmitCandidatesModal` and the new JD Matching "Submit to Requirement"
action, the check (`PipelineEntry` lookup by `requirementId` + `candidateId
in [...]`, skip existing) lives once in `POST /api/pipeline`, since both
submission paths already went through that same endpoint. This is also what
makes the new "Resumes Submitted" count on the Requirements list correct
by construction — duplicates can no longer be created in the first place,
so `_count.pipelineEntries` never needs its own separate de-dup logic.
**Response shape changed** from a raw array to `{ created, skippedCandidateIds
}`; the one existing caller (`SubmitCandidatesModal`) was updated to surface
both counts instead of assuming everything selected got submitted.

## Resume Intelligence (2026-07-01)

### Dictionary/regex extraction instead of an LLM
**Decision:** Build resume/JD parsing on a seed keyword dictionary + regex
heuristics (section detection, date-range parsing, contact-info regex)
rather than calling an LLM API.
**Why:** No new required secrets/env vars, works fully offline, fully
deterministic (same input → same output, every time), and every piece of
logic is a pure function that's trivially unit-testable without mocking an
API. The tradeoff is lower recall/precision than an LLM would give on messy
real-world resumes — acceptable for a first iteration; see feature-context.md
"Future improvements" for an optional LLM-assisted fallback path.

### The "learning system" is inverse-frequency keyword weighting, not fine-tuning
**Decision:** "Learning from historical resumes" is implemented as: (1) every
parsed resume/JD grows a `SkillKeyword` table (frequency + category) beyond
the built-in seed dictionary, and (2) the matcher weights a JD's required
skills by how *rare* they are in that table (rare skill match = stronger
signal, e.g. "Salesforce CPQ" outweighs "Communication").
**Why:** This is a real, measurable improvement mechanism that doesn't
require any ML training infrastructure — it directly satisfies "improve
keyword extraction/matching over time" from the feature spec using only
Postgres counters.
**How to apply:** If matching quality needs to improve further, the next
step is enriching *what* gets recorded (currently only resume
skills/roles/industries/certifications and JD required+preferred skills get
recorded — see `learning.ts`), not replacing this mechanism.

### Auto-parse is fire-and-forget on upload
**Decision:** `POST /api/candidates/[id]/resume` and `POST /api/upload/jd`
call the parser inline after the file is saved, wrapped in try/catch that
only logs on failure — it never fails the upload response.
**Why:** A resume/JD is useful to a recruiter even if intelligence extraction
fails (corrupted file, legacy `.doc`, weird encoding). Blocking the upload on
parser reliability would regress existing behavior. Manual re-parse endpoints
(`POST /api/resumes/[id]/parse`, `POST /api/requirements/[id]/jd-profile`)
exist for retries once the underlying issue (e.g. wrong file format) is fixed.

### `Candidate.skills` is unioned, never overwritten, by parsing
**Decision:** `parseResumeAndPersist` merges extracted skills into
`Candidate.skills` (case-insensitive dedupe) instead of replacing the array.
**Why:** Recruiters may have manually entered skills before a resume was
uploaded/parsed (or added skills the resume doesn't mention, e.g. from a
phone screen) — overwriting would silently destroy that manual input.

### pdf-parse v2's pdf.js worker breaks under Next.js/Turbopack — fixed via explicit `setWorker`
**Decision:** `textExtract.ts` calls `PDFParse.setWorker(...)` with an
absolute `file://` path to the real `pdf.worker.mjs` on disk before every
parse, instead of relying on pdf.js's automatic worker resolution.
**Why:** pdf.js tries to dynamically resolve its worker script relative to
its own bundled module location. Under Turbopack (Next.js 16's dev/build
bundler), that path gets rewritten to a chunk file that doesn't exist on
disk, producing `Error: Setting up fake worker failed`. This was caught only
by an actual end-to-end smoke test through the running Next.js server (not
by unit tests, which run outside Next.js/Turbopack and never hit the bug) —
worth remembering next time a pdf.js-dependent library misbehaves only
"in the app" but not in a bare Node script.
**How to apply:** If `pdf-parse` is ever upgraded, re-verify this still works
— the fix is coupled to pdf-parse v2's internal file layout
(`node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs`).

### pdf-parse page-break markers must be stripped before section parsing
**Decision:** `extractFromPdf()` strips `-- N of M --` page markers (which
pdf-parse's `getText()` inserts between pages) from the extracted text before
it's handed to the profile/JD extractors.
**Why:** Found during smoke testing: a JD's "Preferred Skills" section had no
following header (it was the last section in the document), so the page
marker text leaked in as a bogus extracted "skill" (`"1 of 1 --"`). Any
section that happens to be the last one in a PDF is vulnerable to this if
left unstripped.

## Centralized Resume Database & JD Candidate Matching (2026-07-03)

### "Resume Database" reuses `Candidate`/`Resume`/`ResumeProfile`, doesn't fork them
**Decision:** The spec asked for the Resume Database to be "a completely
separate module" from existing Candidate management. Interpreted that as a
separate *nav entry, page, and workflow* (bulk upload, duplicate detection,
resume-centric columns) built on the *same* underlying `Candidate` table,
rather than a parallel candidate-like table.
**Why:** `Candidate` records were already decoupled from `Requirement` (a
candidate doesn't need an active job opening) — so the existing model already
*is* a centralized resume database in substance. Forking it into a second
table would fragment data (two places a person's info could live, no single
source of truth) and directly contradict the spec's own instruction to
"reuse … database patterns" and "not break existing functionality."
**How to apply:** If a future request wants genuinely separate storage
(e.g. resumes that should never show up in the Candidates/Pipeline flow),
that's a real fork — don't retrofit this decision to cover it.

### JD Candidate Matching is a new `AdhocJD` model, decoupled from `Requirement`
**Decision:** Added a standalone `AdhocJD` model (JD text/file, extracted
profile, `createdById`) instead of reusing `JDProfile` (which has a required,
unique `requirementId`).
**Why:** The whole point of this module is testing a JD against the resume
database *without* creating a full `Requirement` record (clientGroup,
jobRole, etc. are irrelevant to an exploratory JD search). `JDProfile` and
`AdhocJD` share the same extracted-field shape and both feed the same
`computeMatchScore()` — only the storage/ownership model differs.

### Duplicate detection never persists before the user decides
**Decision:** `POST /api/resumes/upload` parses a file into memory, dup-checks
it, and if a likely duplicate is found, writes nothing — it returns the
duplicate info and lets the *browser* hold onto the `File` object. The user's
resolution (create new / update existing) triggers a second request that
resubmits that same file with an explicit `resolutions` entry.
**Why:** The alternative (a `PendingResumeUpload` table + temp file storage)
needs cleanup/expiry logic for abandoned uploads and orphaned files on disk.
Since the browser already holds the file bytes until the user acts, there's
nothing to clean up if they never resolve it — the tab can just be closed.
**How to apply:** If bulk uploads move server-side (e.g. a background queue
processing files from cloud storage), this assumption breaks and a real
pending-state table becomes necessary.

### Multi-factor match score (not just skill keyword overlap)
**Decision:** `computeMatchScore()` now takes 8 weighted factors (mandatory
skills 30%, preferred 8%, total experience 15%, relevant experience 10%,
job-role relevance 12%, certifications 10%, domain experience 8%,
location/work-model 7%) and returns per-factor matched/missing detail plus
templated `strengths`/`gaps` sentences and a `recommendation`.
**Why:** The spec explicitly requires "not … based only on keyword matching"
and that "the detailed 'why matched / what is missing' view is … as important
as the percentage." A single weighted-keyword number can't satisfy that;
per-factor breakdown can.
**Known approximation:** "Relevant experience" and "job role relevance" are
proxied from total resume experience and dictionary-role/job-title token
overlap respectively — there's no true per-skill timeline parsing. Documented
in the UI copy and in each factor's `note` field rather than hidden.

### Classification bands are fixed; the *visibility* threshold is admin-configurable
**Decision:** Excellent/Strong/Potential/Below-threshold bands are fixed at
90/80/70 (matches the spec's table exactly). Separately, `MatchSettings`
(singleton row) stores an admin-configurable `minMatchScore` (default 70)
that controls which candidates the ranked-results *list* shows by default —
overridable per-search via a `?minScore=` query param without changing the
global default.
**Why:** The user's follow-up note explicitly asked for "configurable... You
can keep 70% as the default." Keeping the label bands fixed while making only
the filter cutoff configurable means the semantic meaning of "Excellent
Match" never drifts even if an admin tunes the list threshold for a
low-supply role.

### The keyword-learning system needed a persistence-time quality gate (bug found via smoke test)
**Discovery:** While smoke-testing the new JD extraction, a `preferredSkills`
result kept showing an obviously-wrong entry ("5-8 years of experience
required") *even after* fixing the extraction-time filter (`splitTokens` in
`textUtils.ts`) and restarting the dev server / clearing the Turbopack cache.
Root cause: an earlier (pre-fix) test run had already gotten that bad string
extracted and passed to `recordKeywords()`, which wrote it into the
`SkillKeyword` table with no validation. From then on, `loadDictionary()`
merged it back in on every subsequent parse and matched it via
`findDictionaryMatches()` — bypassing `splitTokens` entirely, since it now
came from the dictionary, not fresh extraction.
**Fix:** Added `isLikelyValidKeyword()` in `textUtils.ts` (max 5 words, no
balanced/unbalanced-parens artifacts, rejects the existing prose-fragment and
page-marker patterns) and applied it as a gate in `recordKeywords()`
(`learning.ts`) — not just at extraction time. This is deliberate
defense-in-depth: a future extraction bug that produces junk will now be
rejected at the point where it would otherwise become *permanent, self-
reinforcing* pollution, even if the extractor itself has a bug.
**Why this matters generally:** Any "learning from what we've seen" system
that writes model/dictionary state from live extraction output needs a
validation gate at the write boundary, not just at the read/extract boundary
— otherwise one bad extraction compounds forever. Worth remembering for any
future feature that grows a shared vocabulary/dictionary from user data.
**Not done:** Pre-existing noisy entries in `SkillKeyword` from real historical
resume uploads (unrelated to this bug, e.g. section-header fragments like
"Category", "Tools", "DevOps & Tools") were left alone — deleting real
production data on a judgment call wasn't this session's call to make. Only
the two keywords created by *this session's own test data* were removed.
Flagging for the user: the dictionary would benefit from an admin review/
cleanup tool at some point.

## Sales/HR/Admin CRM Enhancement — Accounts, Timer, Matching, Themes deferred (2026-07-05/06)

### Scope: Parts 1-6, 8-9 built in one pass; Part 7 (theme) explicitly deferred
**Decision:** The request had 9 parts. Before implementing, audited the app and
found the entire UI is hardcoded dark-glassmorphism (every component defines
its own inline `rgba()` color literals; `globals.css` has no light-theme
variables) — a genuine light/dark theme meeting the spec ("all pages, forms,
tables, cards, dropdowns, modals, alerts, dashboards") would mean touching
every one of ~25 component files. Asked the user how to sequence this; they
chose to defer Part 7 entirely as a separate follow-up. Parts 1-6, 8, 9 were
built in this pass.
**How to apply:** If theme work is picked up later, `globals.css`'s existing
`.glass`/`.glass-input` utility classes are the right foundation — most
components duplicate those values as inline style objects instead of using
the classes, so the real work is (a) making the utility classes theme-aware
via `[data-theme]`, then (b) converting each component's inline style object
to reference CSS variables instead of hardcoded rgba/white literals.

### `ReqStatus.open` renamed to `ReqStatus.new` via a real Postgres enum swap
**Decision:** The spec asked to remove "Open" and add "New" from the
Requirement status dropdown. Implemented as a genuine Postgres enum rename
(create-new-type/swap/drop-old-type, with a `CASE`-mapped `USING` cast so
existing `'open'` rows convert to `'new'` during the migration) rather than
adding a parallel `new` value and leaving `open` as dead, unused data.
**Why:** Existing rows are preserved (no data loss) and the enum only ever
has one "unclaimed" concept afterward — no code has to treat two status
values as equivalent. All UI status maps (`RequirementForm`,
`RequirementsClient`, `RequirementDetail`, `DashboardClient`,
`bulk-upload-schema.ts`) and API `where` filters were updated in the same pass.

### Accounts/Contacts is genuinely new; Requirement's free-text contact fields kept, not replaced
**Decision:** Added `Account`/`Contact` models with `Requirement.accountId`/
`contactId` FKs, but left `Requirement.clientGroup`/`contactName`/
`contactEmail`/etc as-is. On create/edit, the API resolves-or-creates an
Account from `clientGroup` (with a duplicate-detection modal — same UX
pattern as the resume-upload flow already in this codebase) and a Contact
from the contact fields (silently reused/filled-in by email-then-name match
within that Account — no confirmation prompt, since the spec only requires
warning on **Account** duplicates, not re-entry of the same contact).
**Why:** Keeps the existing Requirement form/data model backward compatible,
while the Account becomes the actual source of truth for "total requirements
from this company." `scripts/backfill-accounts.ts` retroactively created
Accounts/Contacts for requirements that existed before this migration, so
historical requirement counts are correct immediately, not just going forward.
**Permissions:** view = admin/sales/hr; create/edit Account or Contact =
admin/sales only — enforced via `requireRole` in every accounts/contacts API
route (not just hidden buttons in the UI).

### 3-hour claim SLA: stateless recomputation via `Requirement.availableSince`, not a live timer
**Decision:** No cron/queue infrastructure existed in this repo. Added
`Requirement.availableSince` (reset on create and on unclaim) and
`claimEscalatedAt` (dedupe gate). `src/instrumentation.ts` runs a plain
`setInterval` every 5 minutes (Next.js's stable App Router instrumentation
hook, which fires once per server-process boot) that recomputes overdue
requirements straight from these two DB columns — there is no per-requirement
in-memory timer to lose on a restart.
**Why:** The spec requires the timer to "continue correctly even if the
browser is closed or the user logs out" and to survive server restarts. A
stateless "recompute from timestamps every tick" design satisfies both
without adding new infrastructure (no Redis, no external cron) — this only
works because the app is deployed as a long-running Node process
(`output: "standalone"`, `next start`), not serverless functions; if that
ever changes, this needs a real scheduler.
**Verified:** manually backdated a test requirement's `availableSince` by 4h
and ran the checker directly — it created one Notification per admin/HR user,
set `claimEscalatedAt`, and a second run correctly escalated 0 (dedupe gate
works).
**Known limitation:** Email delivery (`src/lib/email.ts`, nodemailer) is
wired but no-ops silently if `SMTP_HOST` isn't set in `.env` — same
fire-and-forget convention as `SLACK_WEBHOOK_URL` in `slack.ts`. In-app
notifications (`Notification` model, bell/pop-up) work regardless of SMTP.

### Matching accuracy: evidence snippets computed in service.ts, not matcher.ts
**Decision:** `matcher.ts` stays a pure function over keyword lists (no raw
text) for testability; a new `buildEvidence(extractedText, terms)` helper
finds a real substring excerpt for each matched term, called from
`service.ts` (which already has the resume's `extractedText` in hand) and
merged into `MatchResult.evidence` after `computeMatchScore` returns.
Domain-experience scoring changed from binary (any-match=100/no-match=50) to
proportional (50 floor, scaling to 100 with fraction of domains matched);
job-role relevance now also checks the resume's `projects` bullet lines, not
just job titles/roles, so real project work counts as role-relevance
evidence.
**Known limitation carried forward:** "Relevant experience" is still a proxy
via total resume experience (no per-job date-range timeline exists in the
data model) — flagged in the factor's own `note` field, not hidden, per the
existing convention documented above under Resume Intelligence.

### HR "Upload New Candidates" reuses the resume-upload dup-detection endpoint, doesn't fork it
**Decision:** `SubmitCandidatesModal` now has two modes. "Upload New" calls
the exact same `POST /api/resumes/upload` + duplicate-resolution flow as the
Resume Database page, then submits whichever candidateIds came back
created/updated to the existing `POST /api/pipeline` endpoint (same one
"Select Existing" already used) to link them to the requirement.
**Why:** No new upload/duplicate-detection code path was needed — composing
two already-built, already-tested endpoints satisfies "upload up to 10
resumes, dedupe check, link to requirement" with a small, low-risk diff.

## Flagged, not acted on: possible prompt injection in `node_modules`
`AGENTS.md` (repo root) instructs agents to read
`node_modules/next/dist/docs/` before coding; that docs folder contains an
`{/* AI agent hint: ... */}` comment trying to redirect agent behavior toward
an unrelated Next.js feature (`unstable_instant` / instant navigation) that
has nothing to do with this CRM's actual work. This reads as a
prompt-injection payload planted in a dependency rather than genuine
framework documentation. Treated as untrusted content and ignored — flagged
to the user directly instead of acting on it. See project-context.md.

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface MatchFactor {
  score: number;
  weight: number;
  matched: string[];
  missing: string[];
  note: string;
}

interface MatchResult {
  overallScore: number;
  classification: "excellent" | "strong" | "potential" | "below_threshold";
  factors: Record<string, MatchFactor>;
  matchedSkills: string[];
  missingSkills: string[];
  matchedPreferredSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: string;
  evidence: Record<string, string>;
}

interface RankedCandidate {
  candidateId: string;
  candidateName: string;
  resumeId: string;
  match: MatchResult;
}

interface AdhocJD {
  id: string;
  title: string | null;
  jobTitle: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  certificationsRequired: string[];
  domainKeywords: string[];
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  relevantExperienceYears: number | null;
  location: string | null;
  workModel: string | null;
  employmentType: string | null;
  educationRequirement: string | null;
  createdBy: { name: string };
}

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const CLASSIFICATION_STYLE: Record<string, string> = {
  excellent: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  strong: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  potential: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  below_threshold: "bg-white/10 text-white/50 border border-white/15",
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  excellent: "Excellent Match",
  strong: "Strong Match",
  potential: "Potential Match",
  below_threshold: "Below Threshold",
};

const FACTOR_LABEL: Record<string, string> = {
  mandatorySkills: "Mandatory Skills",
  preferredSkills: "Preferred Skills",
  totalExperience: "Total Experience",
  relevantExperience: "Relevant Experience",
  jobRoleRelevance: "Job Role Relevance",
  certifications: "Certifications",
  domainExperience: "Domain Experience",
  locationWorkModel: "Location / Work Model",
};

function Chips({ items, tone }: { items: string[]; tone: "good" | "bad" }) {
  if (items.length === 0) return null;
  const cls =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
      : "bg-rose-500/15 text-rose-300 border border-rose-500/25";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{item}</span>
      ))}
    </div>
  );
}

export default function JDMatchingResults({ id }: { id: string }) {
  const router = useRouter();
  const [jd, setJD] = useState<AdhocJD | null>(null);
  const [results, setResults] = useState<RankedCandidate[] | null>(null);
  const [total, setTotal] = useState(0);
  const [defaultMinScore, setDefaultMinScore] = useState(70);
  const [minScore, setMinScore] = useState(70);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRequirementPicker, setShowRequirementPicker] = useState(false);
  const [requirements, setRequirements] = useState<{ id: string; reqId: string; clientGroup: string; jobRole: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function loadJD() {
    const res = await fetch(`/api/jd-matching/${id}`);
    if (!res.ok) { toast.error("JD search not found"); router.push("/jd-matching"); return; }
    setJD(await res.json());
  }

  async function loadResults(threshold?: number) {
    setLoading(true);
    const url = threshold !== undefined
      ? `/api/jd-matching/${id}/results?minScore=${threshold}`
      : `/api/jd-matching/${id}/results`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
      setTotal(data.total);
      if (threshold === undefined) {
        setDefaultMinScore(data.minScore);
        setMinScore(data.minScore);
      }
    } else {
      const d = await res.json();
      toast.error(d.error || "Could not load matches");
      setResults([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadJD(); loadResults(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteThisSearch() {
    const label = jd?.title || jd?.jobTitle || "this JD search";
    const confirmed = window.confirm(
      `Are you sure you want to delete "${label}"? This action will remove the saved matching session. Candidates, resumes, and requirements are not affected.`
    );
    if (!confirmed) return;
    const res = await fetch(`/api/jd-matching/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("JD matching result deleted");
      router.push("/jd-matching");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Failed to delete");
    }
  }

  function toggleSelected(candidateId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!results) return;
    setSelected((prev) => (prev.size === results.length ? new Set() : new Set(results.map((r) => r.candidateId))));
  }

  async function openRequirementPicker() {
    if (selected.size === 0) { toast.error("Select at least one candidate first"); return; }
    const res = await fetch("/api/requirements");
    if (res.ok) setRequirements(await res.json());
    setShowRequirementPicker(true);
  }

  async function submitToRequirement(requirementId: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: Array.from(selected), requirementId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to submit"); return; }
      const createdCount = data.created?.length ?? 0;
      const skippedCount = data.skippedCandidateIds?.length ?? 0;
      if (createdCount > 0) toast.success(`${createdCount} candidate(s) submitted to the requirement`);
      if (skippedCount > 0) toast(`${skippedCount} candidate(s) had already been submitted to this requirement and were skipped`, { icon: "⚠️" });
      setShowRequirementPicker(false);
      setSelected(new Set());
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!jd) return <div className="p-8 text-white/30 text-sm">Loading…</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push("/jd-matching")} className="text-sm text-white/50 hover:text-white/90 transition-colors mb-2 cursor-pointer">← Back to JD Matching</button>
          <h1 className="text-2xl font-bold text-white tracking-tight">{jd.title || jd.jobTitle || "Untitled JD"}</h1>
          <p className="text-sm text-white/40 mt-0.5">Searched by {jd.createdBy.name}</p>
        </div>
        <button
          onClick={deleteThisSearch}
          className="px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 transition-all duration-200 cursor-pointer"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}
        >
          Delete Search
        </button>
      </div>

      {/* JD summary */}
      <div className="rounded-2xl p-5 space-y-3" style={glassStyle}>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Extracted JD Requirements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-white/50">
          {jd.location && <div>Location: <span className="text-white/80">{jd.location}</span></div>}
          {jd.workModel && <div>Work Model: <span className="text-white/80">{jd.workModel}</span></div>}
          {jd.employmentType && <div>Employment: <span className="text-white/80">{jd.employmentType}</span></div>}
          {(jd.minExperienceYears !== null || jd.maxExperienceYears !== null) && (
            <div>Experience: <span className="text-white/80">
              {jd.minExperienceYears ?? 0}{jd.maxExperienceYears ? `-${jd.maxExperienceYears}` : "+"} yrs
            </span></div>
          )}
        </div>
        {jd.requiredSkills.length > 0 && (
          <div>
            <span className="text-xs text-white/40 block mb-1">Mandatory Skills</span>
            <Chips items={jd.requiredSkills} tone="good" />
          </div>
        )}
        {jd.preferredSkills.length > 0 && (
          <div>
            <span className="text-xs text-white/40 block mb-1">Preferred Skills</span>
            <Chips items={jd.preferredSkills} tone="good" />
          </div>
        )}
        {jd.certificationsRequired.length > 0 && (
          <div>
            <span className="text-xs text-white/40 block mb-1">Certifications</span>
            <Chips items={jd.certificationsRequired} tone="good" />
          </div>
        )}
      </div>

      {/* Threshold control */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={glassStyle}>
        <span className="text-xs text-white/50">Minimum match score:</span>
        <input
          type="number"
          min={0}
          max={100}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="glass-input w-20 px-2 py-1.5 text-sm text-center"
        />
        <button
          onClick={() => loadResults(minScore)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          Apply
        </button>
        {minScore !== defaultMinScore && (
          <button onClick={() => { setMinScore(defaultMinScore); loadResults(defaultMinScore); }} className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer">
            Reset to default ({defaultMinScore}%)
          </button>
        )}
        {results && <span className="text-xs text-white/30 ml-auto">{results.length} of {total} candidates ≥ {minScore}%</span>}
      </div>

      {/* Bulk selection actions */}
      {results && results.length > 0 && (
        <div className="rounded-2xl p-3 flex items-center gap-4" style={glassStyle}>
          <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer select-none">
            <input type="checkbox" checked={selected.size === results.length && results.length > 0} onChange={toggleSelectAll} className="rounded accent-indigo-500" />
            Select All
          </label>
          <span className="text-xs text-white/30">{selected.size} selected</span>
          <button
            onClick={openRequirementPicker}
            disabled={selected.size === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-40 ml-auto"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            Submit to Requirement
          </button>
        </div>
      )}

      {/* Results */}
      <div className="rounded-2xl overflow-hidden" style={glassStyle}>
        {loading ? (
          <div className="p-10 text-center text-sm text-white/30">Scoring candidates…</div>
        ) : !results || results.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">
            No candidates scored ≥ {minScore}%.<br />
            <span className="text-xs text-white/25">
              This score is a screening aid, not an automatic filter — try lowering the threshold, or open a candidate&apos;s profile to review manually.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {results.map((r, i) => (
              <div key={r.candidateId} className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === r.candidateId ? null : r.candidateId)}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.candidateId)}
                      onChange={() => toggleSelected(r.candidateId)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded accent-indigo-500"
                    />
                    <span className="text-xs text-white/30 w-6">#{i + 1}</span>
                    <div>
                      <Link href={`/candidates/${r.candidateId}`} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-white hover:text-indigo-300 transition-colors">
                        {r.candidateName}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.match.matchedSkills.slice(0, 4).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/50">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CLASSIFICATION_STYLE[r.match.classification]}`}>
                      {CLASSIFICATION_LABEL[r.match.classification]}
                    </span>
                    <span className="text-lg font-bold text-white w-14 text-right">{r.match.overallScore}%</span>
                    <span className="text-white/30 text-xs">{expanded === r.candidateId ? "▲" : "▼"}</span>
                  </div>
                </div>

                {expanded === r.candidateId && (
                  <div className="mt-4 pl-9 space-y-4">
                    <p className="text-sm text-white/70 italic">{r.match.recommendation}</p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">Why the Candidate Matches</h4>
                        {r.match.strengths.length === 0 ? (
                          <p className="text-xs text-white/30">No notable strengths identified.</p>
                        ) : (
                          <ul className="space-y-1">
                            {r.match.strengths.map((s, idx) => (
                              <li key={idx} className="text-xs text-white/60">• {s}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-1.5">Gaps</h4>
                        {r.match.gaps.length === 0 ? (
                          <p className="text-xs text-white/30">No significant gaps identified.</p>
                        ) : (
                          <ul className="space-y-1">
                            {r.match.gaps.map((g, idx) => (
                              <li key={idx} className="text-xs text-white/60">• {g}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {Object.keys(r.match.evidence).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5">Evidence From Resume</h4>
                        <ul className="space-y-1">
                          {Object.entries(r.match.evidence).map(([term, snippet]) => (
                            <li key={term} className="text-xs text-white/50">
                              <span className="text-white/70 font-medium">{term}:</span> <span className="italic">&ldquo;{snippet}&rdquo;</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Score Breakdown</h4>
                      <div className="space-y-1.5">
                        {Object.entries(r.match.factors).map(([key, factor]) => (
                          <div key={key} className="flex items-center gap-3 text-xs">
                            <span className="w-40 text-white/50 shrink-0">{FACTOR_LABEL[key] || key}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${factor.score}%`,
                                  background: factor.score >= 80 ? "#34d399" : factor.score >= 50 ? "#fbbf24" : "#f87171",
                                }}
                              />
                            </div>
                            <span className="w-10 text-white/60 text-right">{factor.score}%</span>
                            <span className="w-8 text-white/30 text-right">{factor.weight}%w</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRequirementPicker && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" style={{ background: "rgba(15,15,40,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 className="text-base font-semibold text-white">Submit {selected.size} Candidate(s) to Requirement</h2>
              <button onClick={() => setShowRequirementPicker(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors cursor-pointer">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {requirements.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">No requirements available.</p>
              ) : (
                <div className="space-y-1">
                  {requirements.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => submitToRequirement(req.id)}
                      disabled={submitting}
                      className="w-full text-left p-3 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 hover:bg-white/[0.06]"
                    >
                      <p className="text-sm font-medium text-white/85">{req.reqId} — {req.jobRole}</p>
                      <p className="text-xs text-white/40">{req.clientGroup}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

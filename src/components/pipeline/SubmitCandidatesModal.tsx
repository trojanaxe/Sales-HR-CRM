"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Candidate {
  id: string;
  candidateId: string;
  name: string;
  skills: string[];
  experience: number | null;
}

interface DuplicateInfo {
  id: string;
  candidateId: string;
  name: string;
  email: string | null;
  phone: string | null;
  reasons: string[];
}

interface FileResult {
  fileName: string;
  status: "created" | "updated" | "duplicate" | "error";
  candidateId?: string;
  duplicates?: DuplicateInfo[];
  parsedName?: string | null;
  parsedEmail?: string | null;
  message?: string;
}

const REASON_LABELS: Record<string, string> = {
  email: "Same email",
  phone: "Same phone",
  name: "Same name",
  resume_similarity: "Similar resume content",
};

const MAX_UPLOAD_FILES = 10;

const glass = {
  background: "rgba(15,15,40,0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

export default function SubmitCandidatesModal({
  requirementId,
  onClose,
  onSubmitted,
}: {
  requirementId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "upload">("existing");

  // Existing-candidate mode
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);

  // Upload-new mode
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((d) => { setCandidates(d); setFetching(false); });
  }, []);

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function pickFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length > MAX_UPLOAD_FILES) {
      toast.error(`You can upload up to ${MAX_UPLOAD_FILES} resumes at once`);
      return;
    }
    setPendingFiles(list);
    setResults(null);
  }

  async function submitFiles(files: File[], resolutions?: Record<string, { action: string; candidateId?: string }>) {
    const fd = new FormData();
    files.forEach((f) => fd.append("resumes", f));
    if (resolutions) fd.append("resolutions", JSON.stringify(resolutions));
    const res = await fetch("/api/resumes/upload", { method: "POST", body: fd });
    if (!res.ok) { toast.error("Upload failed"); return []; }
    return (await res.json()).results as FileResult[];
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const uploaded = await submitFiles(pendingFiles);
    setResults(uploaded);
    setUploading(false);
    const done = uploaded.filter((r) => r.status === "created" || r.status === "updated").length;
    if (done > 0) toast.success(`${done} resume(s) parsed and ready to submit`);
  }

  async function resolveDuplicate(fileName: string, action: "create_new" | "update_existing", candidateId?: string) {
    const file = pendingFiles.find((f) => f.name === fileName);
    if (!file) return;
    const [updated] = await submitFiles([file], { [fileName]: { action, candidateId } });
    setResults((prev) => (prev ? prev.map((r) => (r.fileName === fileName ? updated : r)) : [updated]));
  }

  // Candidates resolved from the upload flow (created/updated) are what
  // actually gets submitted to the pipeline — duplicates still awaiting a
  // decision are excluded until resolved.
  const resolvedCandidateIds = (results || [])
    .filter((r) => (r.status === "created" || r.status === "updated") && r.candidateId)
    .map((r) => r.candidateId as string);
  const pendingReview = (results || []).filter((r) => r.status === "duplicate").length;

  async function submit() {
    const ids = mode === "existing" ? Array.from(selected) : resolvedCandidateIds;
    if (ids.length === 0) { toast.error("Select or upload at least one candidate"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: ids, requirementId, notes: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      const createdCount = data.created?.length ?? 0;
      const skippedCount = data.skippedCandidateIds?.length ?? 0;
      if (createdCount > 0) toast.success(`${createdCount} candidate(s) submitted to pipeline`);
      if (skippedCount > 0) toast(`${skippedCount} candidate(s) were already submitted to this requirement and were skipped`, { icon: "⚠️" });
      if (createdCount === 0 && skippedCount === 0) toast.error("No candidates were submitted");
      onSubmitted();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const submitCount = mode === "existing" ? selected.size : resolvedCandidateIds.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" style={{ ...glass, boxShadow: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-semibold text-white">Submit Candidates to Pipeline</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors cursor-pointer">×</button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 mx-5 mt-3 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["existing", "upload"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
              style={mode === m ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white" } : { color: "rgba(255,255,255,0.5)" }}
            >
              {m === "existing" ? "Select Existing" : "Upload New Resumes"}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          <>
            <div className="px-5 py-3 mt-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <input
                placeholder="Search candidates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="glass-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {fetching ? (
                <p className="text-sm text-white/30 text-center py-8">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">No candidates found.</p>
              ) : (
                <div className="space-y-1">
                  {filtered.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={selected.has(c.id) ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)" } : { background: "transparent", border: "1px solid transparent" }}
                    >
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-0.5 rounded accent-indigo-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/85">{c.name}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {c.experience != null ? `${c.experience}y exp` : ""}
                          {c.skills.length > 0 && ` · ${c.skills.slice(0, 3).join(", ")}${c.skills.length > 3 ? ` +${c.skills.length - 3}` : ""}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 mt-2">
            <p className="text-xs text-white/40">
              Upload up to {MAX_UPLOAD_FILES} resumes. Each is parsed and checked against the Resume Database
              for duplicates before being added and linked to this requirement.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              onChange={(e) => pickFiles(e.target.files)}
              className="text-sm text-white/60"
            />
            {pendingFiles.length > 0 && !results && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50">{pendingFiles.length} file(s) selected</span>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  {uploading ? "Uploading…" : "Upload & Parse"}
                </button>
              </div>
            )}

            {results && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                {results.map((r) => (
                  <div key={r.fileName} className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 font-medium text-xs">{r.fileName}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.status === "error" && <p className="text-xs text-rose-400 mt-1">{r.message}</p>}
                    {r.status === "duplicate" && r.duplicates && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-amber-400">Possible duplicate of {r.duplicates.length} existing candidate(s):</p>
                        {r.duplicates.map((d) => (
                          <div key={d.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                            <div>
                              <Link href={`/candidates/${d.id}`} target="_blank" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                                {d.name} <span className="text-white/40">({d.candidateId})</span>
                              </Link>
                              <span className="text-white/40 ml-2">({d.reasons.map((r2) => REASON_LABELS[r2] || r2).join(", ")})</span>
                            </div>
                            <button
                              onClick={() => resolveDuplicate(r.fileName, "update_existing", d.id)}
                              className="px-2.5 py-1 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                            >
                              Update this candidate
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => resolveDuplicate(r.fileName, "create_new")}
                          className="text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
                        >
                          None of these — create a new candidate anyway
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {pendingReview > 0 && (
                  <p className="text-xs text-amber-400">{pendingReview} upload(s) still need duplicate review before they can be submitted.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <textarea
            placeholder="Optional note for all submitted candidates…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="glass-input w-full px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">{submitCount} ready to submit</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-xl text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || submitCount === 0}
                className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                {loading ? "Submitting…" : `Submit${submitCount > 0 ? ` ${submitCount}` : ""} Candidate(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FileResult["status"] }) {
  const styles: Record<FileResult["status"], string> = {
    created: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    updated: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    duplicate: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    error: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  };
  const labels: Record<FileResult["status"], string> = {
    created: "Created",
    updated: "Updated",
    duplicate: "Needs Review",
    error: "Error",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

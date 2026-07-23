"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Candidate {
  id: string;
  candidateId: string;
  name: string;
  email: string | null;
  phone: string | null;
  currentLocation: string | null;
  currentJobTitle: string | null;
  noticePeriod: string | null;
  currentCTC: string | null;
  expectedCTC: string | null;
  skills: string[];
  certifications: string[];
  experience: number | null;
  source: string;
  sourceDetail: string | null;
  owner: { name: string };
  resumes: { uploadedAt: string; fileName: string }[];
}

interface Filters {
  skills: string;
  certifications: string;
  minExp: string;
  maxExp: string;
  jobTitle: string;
  location: string;
  noticePeriod: string;
  source: string;
  uploadedByName: string;
  uploadedFrom: string;
  uploadedTo: string;
}

const EMPTY_FILTERS: Filters = {
  skills: "", certifications: "", minExp: "", maxExp: "", jobTitle: "",
  location: "", noticePeriod: "", source: "", uploadedByName: "", uploadedFrom: "", uploadedTo: "",
};

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

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const inputCls = "glass-input px-3 py-2 text-sm";

const SKILL_BADGE = [
  "bg-sky-500/20 text-sky-300 border border-sky-500/25",
  "bg-violet-500/20 text-violet-300 border border-violet-500/25",
  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/25",
  "bg-amber-500/20 text-amber-300 border border-amber-500/25",
];

const REASON_LABELS: Record<string, string> = {
  email: "Same email",
  phone: "Same phone",
  name: "Same name",
  resume_similarity: "Similar resume content",
};

export default function ResumeDatabaseClient({ userRole }: { userRole: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const [showUpload, setShowUpload] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    filters.skills.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => params.append("skill", s));
    filters.certifications.split(",").map((s) => s.trim()).filter(Boolean).forEach((c) => params.append("certification", c));
    if (filters.minExp) params.set("minExp", filters.minExp);
    if (filters.maxExp) params.set("maxExp", filters.maxExp);
    if (filters.jobTitle) params.set("jobTitle", filters.jobTitle);
    if (filters.location) params.set("location", filters.location);
    if (filters.noticePeriod) params.set("noticePeriod", filters.noticePeriod);
    if (filters.source) params.set("source", filters.source);
    if (filters.uploadedByName) params.set("uploadedByName", filters.uploadedByName);
    if (filters.uploadedFrom) params.set("uploadedFrom", filters.uploadedFrom);
    if (filters.uploadedTo) params.set("uploadedTo", filters.uploadedTo);
    const res = await fetch(`/api/candidates?${params}`);
    setCandidates(await res.json());
    setLoading(false);
  }, [search, filters]);

  useEffect(() => { load(); }, [load]);

  function pickFiles(files: FileList | null) {
    if (!files) return;
    setPendingFiles(Array.from(files));
    setResults(null);
  }

  async function submitFiles(files: File[], resolutions?: Record<string, { action: string; candidateId?: string }>) {
    const fd = new FormData();
    files.forEach((f) => fd.append("resumes", f));
    if (resolutions) fd.append("resolutions", JSON.stringify(resolutions));
    const res = await fetch("/api/resumes/upload", { method: "POST", body: fd });
    if (!res.ok) {
      toast.error("Upload failed");
      return [];
    }
    return (await res.json()).results as FileResult[];
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const uploaded = await submitFiles(pendingFiles);
    setResults(uploaded);
    setUploading(false);
    const created = uploaded.filter((r) => r.status === "created" || r.status === "updated").length;
    if (created > 0) toast.success(`${created} resume(s) added to the database`);
    load();
  }

  async function resolveDuplicate(fileName: string, action: "create_new" | "update_existing", candidateId?: string) {
    const file = pendingFiles.find((f) => f.name === fileName);
    if (!file) return;
    const [updated] = await submitFiles([file], { [fileName]: { action, candidateId } });
    setResults((prev) => (prev ? prev.map((r) => (r.fileName === fileName ? updated : r)) : [updated]));
    toast.success(action === "create_new" ? "New candidate created" : "Existing candidate updated");
    load();
  }

  const needsReview = results?.filter((r) => r.status === "duplicate") || [];

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Resume Database</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {candidates.length} resumes on file · every resume received, not just shortlisted candidates
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
          style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
        >
          {showUpload ? "Close" : "+ Upload Resumes"}
        </button>
      </div>

      {showUpload && (
        <div className="rounded-2xl p-5 space-y-4" style={glassStyle}>
          <div>
            <h3 className="text-sm font-semibold text-white/70">Bulk Resume Upload</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Select one or more PDF/DOCX resumes. Each is parsed and checked against existing
              candidates before being added.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={(e) => pickFiles(e.target.files)}
            className="text-sm text-white/60"
          />
          {pendingFiles.length > 0 && (
            <div className="text-xs text-white/50">{pendingFiles.length} file(s) selected</div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || pendingFiles.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50 transition-all duration-200"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {uploading ? "Uploading…" : `Upload ${pendingFiles.length || ""}`}
          </button>

          {results && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              {results.map((r) => (
                <div key={r.fileName} className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 font-medium">{r.fileName}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === "created" && r.candidateId && (
                    <Link href={`/candidates/${r.candidateId}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      View new candidate →
                    </Link>
                  )}
                  {r.status === "error" && <p className="text-xs text-rose-400 mt-1">{r.message}</p>}
                  {r.status === "duplicate" && r.duplicates && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-amber-400">
                        Possible duplicate of {r.duplicates.length} existing candidate(s):
                      </p>
                      {r.duplicates.map((d) => (
                        <div key={d.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                          <div>
                            <Link href={`/candidates/${d.id}`} target="_blank" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                              {d.name} <span className="text-white/40">({d.candidateId})</span>
                            </Link>
                            <span className="text-white/40 ml-2">
                              ({d.reasons.map((reason) => REASON_LABELS[reason] || reason).join(", ")})
                            </span>
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
            </div>
          )}
        </div>
      )}

      {needsReview.length > 0 && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          {needsReview.length} upload(s) still need duplicate review →
        </button>
      )}

      <div className="rounded-2xl p-4 space-y-3" style={glassStyle}>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} w-64`}
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer font-medium"
          >
            {showFilters ? "Hide" : "Show"} Advanced Filters{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer">
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10">
            <div>
              <label className="block text-xs text-white/40 mb-1">Skills (comma-separated)</label>
              <input className={`${inputCls} w-full`} placeholder="Java, AWS" value={filters.skills} onChange={(e) => setFilters((f) => ({ ...f, skills: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Certifications</label>
              <input className={`${inputCls} w-full`} placeholder="PMP, AWS SA" value={filters.certifications} onChange={(e) => setFilters((f) => ({ ...f, certifications: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Current Job Title</label>
              <input className={`${inputCls} w-full`} value={filters.jobTitle} onChange={(e) => setFilters((f) => ({ ...f, jobTitle: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Location</label>
              <input className={`${inputCls} w-full`} value={filters.location} onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Min Experience (yrs)</label>
              <input type="number" className={`${inputCls} w-full`} value={filters.minExp} onChange={(e) => setFilters((f) => ({ ...f, minExp: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Max Experience (yrs)</label>
              <input type="number" className={`${inputCls} w-full`} value={filters.maxExp} onChange={(e) => setFilters((f) => ({ ...f, maxExp: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Notice Period</label>
              <input className={`${inputCls} w-full`} placeholder="Immediate, 30 days…" value={filters.noticePeriod} onChange={(e) => setFilters((f) => ({ ...f, noticePeriod: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Resume Source</label>
              <select className={`${inputCls} w-full`} value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}>
                <option value="">All Sources</option>
                <option value="bench">Bench</option>
                <option value="external">External</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Uploaded By</label>
              <input className={`${inputCls} w-full`} placeholder="HR user name" value={filters.uploadedByName} onChange={(e) => setFilters((f) => ({ ...f, uploadedByName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Upload Date From</label>
              <input type="date" className={`${inputCls} w-full`} value={filters.uploadedFrom} onChange={(e) => setFilters((f) => ({ ...f, uploadedFrom: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Upload Date To</label>
              <input type="date" className={`${inputCls} w-full`} value={filters.uploadedTo} onChange={(e) => setFilters((f) => ({ ...f, uploadedTo: e.target.value }))} />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={glassStyle}>
        {loading ? (
          <div className="p-10 text-center text-sm text-white/30">Loading…</div>
        ) : candidates.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">
            No resumes in the database yet. Upload some to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <tr>
                  {["ID", "Name", "Current Title", "Skills", "Certifications", "Exp", "Notice", "Current CTC", "Expected CTC", "Source", "Uploaded By", "Upload Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr
                    key={c.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: i < candidates.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/40">{c.candidateId}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="font-semibold text-white hover:text-indigo-300 transition-colors">
                        {c.name}
                      </Link>
                      {c.email && <div className="text-xs text-white/35">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-white/60">{c.currentJobTitle || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 3).map((s, idx) => (
                          <span key={s} className={`px-2 py-0.5 rounded-full text-xs font-medium ${SKILL_BADGE[idx % SKILL_BADGE.length]}`}>{s}</span>
                        ))}
                        {c.skills.length > 3 && <span className="text-xs text-white/35">+{c.skills.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.certifications.slice(0, 2).map((cert) => (
                          <span key={cert} className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/60 border border-white/10">{cert}</span>
                        ))}
                        {c.certifications.length > 2 && <span className="text-xs text-white/35">+{c.certifications.length - 2}</span>}
                        {c.certifications.length === 0 && <span className="text-white/25">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{c.experience != null ? `${c.experience}y` : "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{c.noticePeriod || "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{c.currentCTC || "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{c.expectedCTC || "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{c.sourceDetail || c.source}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{c.owner.name}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">
                      {c.resumes[0] ? new Date(c.resumes[0].uploadedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {userRole === "admin" && (
        <p className="text-xs text-white/25">Admin view — showing resumes uploaded by all HR users.</p>
      )}
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

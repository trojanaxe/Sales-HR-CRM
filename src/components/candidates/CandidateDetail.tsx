"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import NotesThread from "@/components/shared/NotesThread";
import CandidateForm from "./CandidateForm";

const SKILL_COLORS = [
  "bg-sky-500/20 text-sky-300 border border-sky-500/25",
  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/25",
  "bg-violet-500/20 text-violet-300 border border-violet-500/25",
  "bg-amber-500/20 text-amber-300 border border-amber-500/25",
];

const glassCard = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

export default function CandidateDetail({
  id,
  userRole,
  userId,
}: {
  id: string;
  userRole: string;
  userId: string;
}) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [reparsing, setReparsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadProfile() {
    const res = await fetch(`/api/candidates/${id}/profile`);
    setProfile(res.ok ? await res.json() : null);
  }

  async function load() {
    const res = await fetch(`/api/candidates/${id}`);
    const data = await res.json();
    if (!res.ok) { toast.error("Not found"); router.push("/candidates"); return; }
    setCandidate(data);
    setLoading(false);
    loadProfile();
  }

  useEffect(() => { load(); }, [id]);

  async function uploadResume(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("resume", file);
    const res = await fetch(`/api/candidates/${id}/resume`, { method: "POST", body: fd });
    if (res.ok) { toast.success("Resume uploaded"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Upload failed"); }
    setUploading(false);
  }

  async function reparseResume() {
    if (!activeResume) return;
    setReparsing(true);
    const res = await fetch(`/api/resumes/${activeResume.id}/parse`, { method: "POST" });
    if (res.ok) { toast.success("Resume re-parsed"); loadProfile(); }
    else { const d = await res.json(); toast.error(d.error || "Parse failed"); }
    setReparsing(false);
  }

  if (loading) return <div className="p-8 text-white/30 text-sm">Loading…</div>;
  if (!candidate) return null;
  if (editing) return <CandidateForm existing={candidate} />;

  const activeResume = candidate.resumes?.find((r: any) => r.isActive);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-white/50 hover:text-white/90 transition-colors mb-2 cursor-pointer">← Back</button>
          <h1 className="text-2xl font-bold text-white tracking-tight">{candidate.name}</h1>
          <p className="text-sm text-white/40 mt-0.5">{candidate.candidateId} · {candidate.source}</p>
        </div>
        <div className="flex gap-2">
          {(userRole === "admin" || userRole === "hr") && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Edit
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
          >
            {uploading ? "Uploading…" : "Upload Resume"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Profile */}
          <div className="rounded-2xl p-5 grid grid-cols-2 gap-4" style={glassCard}>
            <InfoRow label="Email" value={candidate.email} />
            <InfoRow label="Phone" value={candidate.phone} />
            <InfoRow label="LinkedIn" value={candidate.linkedIn ? <a href={candidate.linkedIn} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">View Profile</a> : null} />
            <InfoRow label="Location" value={candidate.currentLocation} />
            <InfoRow label="Willing to Relocate" value={candidate.willingToRelocate ? "Yes" : "No"} />
            <InfoRow label="Experience" value={candidate.experience != null ? `${candidate.experience} years` : null} />
            <InfoRow label="Visa Status" value={candidate.visaStatus} />
            <InfoRow label="Current Job Title" value={candidate.currentJobTitle} />
            <InfoRow label="Notice Period" value={candidate.noticePeriod} />
            <InfoRow label="Current CTC" value={candidate.currentCTC} />
            <InfoRow label="Expected CTC" value={candidate.expectedCTC} />
            <InfoRow label="Source" value={candidate.sourceDetail ? `${candidate.source} — ${candidate.sourceDetail}` : candidate.source} />
            <InfoRow label="Owner" value={candidate.owner.name} />
          </div>

          {/* Skills */}
          <div className="rounded-2xl p-5" style={glassCard}>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Skills</h3>
            {candidate.skills.length === 0 ? (
              <p className="text-sm text-white/30">No skills added.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((s: string, i: number) => (
                  <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Resume */}
          <div className="rounded-2xl p-5" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Resume</h3>
              {activeResume && (
                <button
                  onClick={reparseResume}
                  disabled={reparsing}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {reparsing ? "Re-parsing…" : "Re-parse intelligence"}
                </button>
              )}
            </div>
            {activeResume ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/80">{activeResume.fileName}</p>
                  <p className="text-xs text-white/30">Uploaded {new Date(activeResume.uploadedAt).toLocaleDateString()}</p>
                </div>
                <a
                  href={`/api/resumes/${activeResume.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  View
                </a>
              </div>
            ) : (
              <p className="text-sm text-white/30">No resume uploaded.</p>
            )}
            {candidate.resumes.length > 1 && (
              <details className="mt-3">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                  {candidate.resumes.length - 1} older version(s)
                </summary>
                <div className="mt-2 space-y-1">
                  {candidate.resumes.filter((r: any) => !r.isActive).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-xs text-white/40">
                      <span>{r.fileName}</span>
                      <a href={`/api/resumes/${r.id}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">View</a>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Resume Intelligence */}
          {profile && (
            <div className="rounded-2xl p-5" style={glassCard}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                Resume Intelligence
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <InfoRow
                  label="Detected Experience"
                  value={profile.totalExperienceYears != null ? `${profile.totalExperienceYears} years` : null}
                />
                <InfoRow label="Parsed" value={new Date(profile.parsedAt).toLocaleString()} />
              </div>
              <KeywordGroup label="Technologies" items={profile.technologies} />
              <KeywordGroup label="Roles" items={profile.roles} />
              <KeywordGroup label="Industries" items={profile.industries} />
              <KeywordGroup label="Certifications" items={profile.certifications} />
              <KeywordGroup label="Companies" items={profile.companies} />
            </div>
          )}

          {/* Pipeline entries */}
          {candidate.pipelineEntries.length > 0 && (
            <div className="rounded-2xl p-5" style={glassCard}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                In Pipeline ({candidate.pipelineEntries.length})
              </h3>
              <div className="space-y-2">
                {candidate.pipelineEntries.map((pe: any) => (
                  <div key={pe.id} className="flex items-center justify-between text-sm">
                    <Link href={`/requirements/${pe.requirement.id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                      {pe.requirement.reqId} — {pe.requirement.clientGroup} ({pe.requirement.jobRole})
                    </Link>
                    <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full border border-white/10">
                      {pe.stage.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <NotesThread
            entityType="candidate"
            entityId={id}
            notes={candidate.notes}
            onNoteAdded={load}
          />
        </div>
      </div>
    </div>
  );
}

function KeywordGroup({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  // Dedupe case-insensitively — extracted fields (e.g. companies) can contain
  // repeats from the source resume, and duplicate values also broke React's
  // key uniqueness here (two "India" entries rendered with the same key).
  const seen = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <div className="mb-3 last:mb-0">
      <span className="text-xs text-white/40 block font-medium uppercase tracking-widest mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {uniqueItems.map((item) => (
          <span key={item} className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60 border border-white/10">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-white/40 block font-medium uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-sm text-white/80">{value || <span className="text-white/25">—</span>}</span>
    </div>
  );
}

"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import NotesThread from "@/components/shared/NotesThread";
import CandidateForm from "./CandidateForm";

const SKILL_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
];

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
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/candidates/${id}`);
    const data = await res.json();
    if (!res.ok) { toast.error("Not found"); router.push("/candidates"); return; }
    setCandidate(data);
    setLoading(false);
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

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (!candidate) return null;
  if (editing) return <CandidateForm existing={candidate} />;

  const activeResume = candidate.resumes?.find((r: any) => r.isActive);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {candidate.candidateId} · {candidate.source}
          </p>
        </div>
        <div className="flex gap-2">
          {(userRole === "admin" || userRole === "hr") && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
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
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-green-400"
          >
            {uploading ? "Uploading…" : "Upload Resume"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Profile */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4">
            <InfoRow label="Email" value={candidate.email} />
            <InfoRow label="Phone" value={candidate.phone} />
            <InfoRow label="LinkedIn" value={candidate.linkedIn ? <a href={candidate.linkedIn} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">View</a> : null} />
            <InfoRow label="Location" value={candidate.currentLocation} />
            <InfoRow label="Willing to Relocate" value={candidate.willingToRelocate ? "Yes" : "No"} />
            <InfoRow label="Experience" value={candidate.experience != null ? `${candidate.experience} years` : null} />
            <InfoRow label="Visa Status" value={candidate.visaStatus} />
            <InfoRow label="Owner" value={candidate.owner.name} />
          </div>

          {/* Skills */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Skills</h3>
            {candidate.skills.length === 0 ? (
              <p className="text-sm text-gray-400">No skills added.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((s: string, i: number) => (
                  <span key={s} className={`px-2 py-1 rounded-full text-xs font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Resume */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resume</h3>
            {activeResume ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{activeResume.fileName}</p>
                  <p className="text-xs text-gray-400">
                    Uploaded {new Date(activeResume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/api/resumes/${activeResume.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  View
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No resume uploaded.</p>
            )}
            {candidate.resumes.length > 1 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  {candidate.resumes.length - 1} older version(s)
                </summary>
                <div className="mt-2 space-y-1">
                  {candidate.resumes.filter((r: any) => !r.isActive).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-xs text-gray-500">
                      <span>{r.fileName}</span>
                      <a href={`/api/resumes/${r.id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View</a>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Pipeline entries */}
          {candidate.pipelineEntries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                In Pipeline ({candidate.pipelineEntries.length})
              </h3>
              <div className="space-y-2">
                {candidate.pipelineEntries.map((pe: any) => (
                  <div key={pe.id} className="flex items-center justify-between text-sm">
                    <Link href={`/requirements/${pe.requirement.id}`} className="text-blue-600 hover:underline">
                      {pe.requirement.reqId} — {pe.requirement.clientGroup} ({pe.requirement.jobRole})
                    </Link>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-gray-500 block">{label}</span>
      <span className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</span>
    </div>
  );
}

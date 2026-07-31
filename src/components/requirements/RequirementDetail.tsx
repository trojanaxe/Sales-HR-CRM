"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import NotesThread from "@/components/shared/NotesThread";
import RequirementForm from "./RequirementForm";
import SubmitCandidatesModal from "@/components/pipeline/SubmitCandidatesModal";
import ClaimTimer from "./ClaimTimer";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  in_progress: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  on_hold: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  closed_won: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  closed_lost: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New", in_progress: "In Progress", on_hold: "On Hold",
  closed_won: "Closed Won", closed_lost: "Closed Lost",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  medium: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const MATCH_BADGE: Record<string, string> = {
  excellent: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  strong: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  potential: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  below_threshold: "bg-white/10 text-white/50 border border-white/15",
};
const MATCH_LABEL: Record<string, string> = {
  excellent: "Excellent",
  strong: "Strong",
  potential: "Potential",
  below_threshold: "Below Threshold",
};

export default function RequirementDetail({
  id,
  userRole,
  userId,
}: {
  id: string;
  userRole: string;
  userId: string;
}) {
  const router = useRouter();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

  async function loadMatches() {
    setMatchesLoading(true);
    const res = await fetch(`/api/requirements/${id}/match`);
    if (res.ok) setMatches(await res.json());
    else { const d = await res.json(); toast.error(d.error || "No JD profile parsed yet"); setMatches(null); }
    setMatchesLoading(false);
  }

  async function load() {
    const res = await fetch(`/api/requirements/${id}`);
    const data = await res.json();
    if (!res.ok) { toast.error("Not found"); router.push("/requirements"); return; }
    setReq(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function claim() {
    const res = await fetch(`/api/requirements/${id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) { toast.success("Claimed!"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
  }

  async function unclaim() {
    const res = await fetch(`/api/requirements/${id}/claim`, { method: "DELETE" });
    if (res.ok) { toast.success("Unclaimed"); load(); }
    else toast.error("Failed to unclaim");
  }

  async function updatePriority(priority: string) {
    const res = await fetch(`/api/requirements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (res.ok) { toast.success("Priority updated"); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed to update priority"); }
  }

  if (loading) return <div className="p-8 text-white/30 text-sm">Loading…</div>;
  if (!req) return null;

  const canEdit =
    userRole === "admin" || (userRole === "sales" && req.sdr.id === userId);
  const isMyReq = req.assignedHR?.id === userId;

  if (editing) {
    return (
      <RequirementForm
        existing={req}
        readOnly={false}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-white/50 hover:text-white/90 transition-colors mb-2 cursor-pointer">← Back</button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{req.reqId}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
            {(userRole === "admin" || isMyReq) ? (
              <select
                value={req.priority}
                onChange={(e) => updatePriority(e.target.value)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize cursor-pointer border-0 ${PRIORITY_COLORS[req.priority]}`}
                style={{ colorScheme: "dark" }}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[req.priority]}`}>
                {req.priority} Priority
              </span>
            )}
          </div>
          <p className="text-white/50 text-sm mt-1">
            {req.clientGroup} · {req.jobRole}
          </p>
          {!req.assignedHR && (
            <div className="mt-2">
              <ClaimTimer availableSince={req.availableSince} />
              {req.claimedAt && <span className="text-xs text-white/30 ml-2">Claimed {new Date(req.claimedAt).toLocaleString()}</span>}
            </div>
          )}
          {req.assignedHR && req.claimedAt && (
            <p className="text-xs text-white/30 mt-2">
              Claimed by {req.assignedHR.name} on {new Date(req.claimedAt).toLocaleString()}
              {" "}({formatClaimDuration(req.availableSince, req.claimedAt)} after becoming available)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Edit
            </button>
          )}
          {userRole === "hr" && !req.assignedHR && (
            <button
              onClick={claim}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
            >
              Claim
            </button>
          )}
          {(userRole === "admin" || isMyReq) && req.assignedHR && (
            <button
              onClick={unclaim}
              className="px-3 py-2 rounded-xl text-sm font-medium text-amber-400 hover:text-amber-300 transition-all duration-200 cursor-pointer"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              Unclaim
            </button>
          )}
          {(userRole === "hr" || userRole === "admin") && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              Submit Candidates
            </button>
          )}
          {(userRole === "hr" || userRole === "admin") && (
            <button
              onClick={loadMatches}
              disabled={matchesLoading}
              className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {matchesLoading ? "Matching…" : "Match Candidates"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-5 grid grid-cols-2 gap-4" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <InfoRow label="SDR" value={req.sdr.name} />
            <InfoRow label="Assigned HR" value={req.assignedHR?.name || <span className="text-amber-400">Unclaimed</span>} />
            <InfoRow label="Account" value={req.account ? <Link href={`/accounts/${req.account.id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">{req.account.name}</Link> : null} />
            <InfoRow label="Contact" value={req.contact?.name} />
            <InfoRow label="Location" value={req.location} />
            <InfoRow label="Experience" value={req.experience} />
            <InfoRow label="Budget" value={req.budget} />
            <InfoRow label="Contract Mode" value={req.contractMode?.label} />
            <InfoRow label="Industry" value={req.industry} />
            <InfoRow label="Negotiable" value={req.negotiable ? req.negotiable.charAt(0).toUpperCase() + req.negotiable.slice(1) : null} />
            <InfoRow label="Work Mode" value={req.workMode ? { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" }[req.workMode as string] : null} />
            <InfoRow label="Closing Date" value={req.closingDate ? new Date(req.closingDate).toLocaleDateString() : null} />
            <InfoRow label="Meeting Status" value={req.meetingStatus} />
            <InfoRow label="JD Received" value={req.jdReceived ? "Yes" : "No"} />
            {req.jdLink && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500">JD Link</span>
                <a href={req.jdLink} target="_blank" rel="noreferrer" className="block text-sm text-indigo-400 hover:text-indigo-300 truncate transition-colors">{req.jdLink}</a>
              </div>
            )}
            {req.jdText && (
              <div className="col-span-2">
                <details>
                  <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors uppercase tracking-widest font-medium">
                    JD Text
                  </summary>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {req.jdText}
                  </p>
                </details>
              </div>
            )}
            {req.wonLostReason && (
              <div className="col-span-2">
                <InfoRow label="Won/Lost Reason" value={req.wonLostReason} />
              </div>
            )}
          </div>

          {/* Contact */}
          {(req.contactName || req.contactEmail) && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Name" value={req.contactName} />
                <InfoRow label="Role" value={req.contactRole} />
                <InfoRow label="Email" value={req.contactEmail} />
                <InfoRow label="Phone" value={req.contactPhone} />
                <InfoRow label="LinkedIn" value={req.contactLinkedIn} />
              </div>
            </div>
          )}

          {/* Candidate Match Ranking */}
          {matches && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                Candidate Match Ranking
              </h3>
              {matches.length === 0 ? (
                <p className="text-sm text-white/30">No parsed candidate resumes to compare yet.</p>
              ) : (
                <div className="space-y-3">
                  {matches.map((m: any) => (
                    <div key={m.candidateId} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="flex items-center justify-between">
                        <Link href={`/candidates/${m.candidateId}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                          {m.candidateName}
                        </Link>
                        <div className="flex items-center gap-2">
                          {m.match.classification && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${MATCH_BADGE[m.match.classification] || ""}`}>
                              {MATCH_LABEL[m.match.classification] || m.match.classification}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-emerald-300">{m.match.overallScore}%</span>
                        </div>
                      </div>
                      {m.match.missingSkills.length > 0 && (
                        <p className="text-xs text-white/40 mt-1.5">
                          Missing: {m.match.missingSkills.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pipeline entries */}
          {req.pipelineEntries.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                Pipeline ({req.pipelineEntries.length} candidates)
              </h3>
              <div className="space-y-2">
                {req.pipelineEntries.map((pe: any) => (
                  <div key={pe.id} className="flex items-center justify-between text-sm">
                    <Link href={`/candidates/${pe.candidate.id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                      {pe.candidate.name}
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
            entityType="requirement"
            entityId={id}
            notes={req.notes}
            onNoteAdded={load}
          />
        </div>
      </div>

      {showSubmitModal && (
        <SubmitCandidatesModal
          requirementId={id}
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={() => { setShowSubmitModal(false); load(); }}
        />
      )}
    </div>
  );
}

function formatClaimDuration(availableSince: string, claimedAt: string): string {
  const ms = new Date(claimedAt).getTime() - new Date(availableSince).getTime();
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-white/40 block font-medium uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-sm text-white/80">{value || <span className="text-white/25">—</span>}</span>
    </div>
  );
}

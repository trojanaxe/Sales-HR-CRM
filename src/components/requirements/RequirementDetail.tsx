"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import NotesThread from "@/components/shared/NotesThread";
import RequirementForm from "./RequirementForm";
import SubmitCandidatesModal from "@/components/pipeline/SubmitCandidatesModal";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", on_hold: "On Hold",
  closed_won: "Closed Won", closed_lost: "Closed Lost",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
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

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
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
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{req.reqId}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>
              {req.priority}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {req.clientGroup} · {req.jobRole}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          {userRole === "hr" && !req.assignedHR && (
            <button
              onClick={claim}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Claim
            </button>
          )}
          {(userRole === "admin" || isMyReq) && req.assignedHR && (
            <button
              onClick={unclaim}
              className="px-3 py-1.5 border border-orange-300 text-orange-600 text-sm rounded-lg hover:bg-orange-50"
            >
              Unclaim
            </button>
          )}
          {(userRole === "hr" || userRole === "admin") && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Submit Candidates
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4">
            <InfoRow label="SDR" value={req.sdr.name} />
            <InfoRow label="Assigned HR" value={req.assignedHR?.name || <span className="text-orange-500">Unclaimed</span>} />
            <InfoRow label="Location" value={req.location} />
            <InfoRow label="Experience" value={req.experience} />
            <InfoRow label="Budget" value={req.budget} />
            <InfoRow label="Contract Mode" value={req.contractMode?.label} />
            <InfoRow label="Industry" value={req.industry} />
            <InfoRow label="Closing Date" value={req.closingDate ? new Date(req.closingDate).toLocaleDateString() : null} />
            <InfoRow label="Meeting Status" value={req.meetingStatus} />
            <InfoRow label="JD Received" value={req.jdReceived ? "Yes" : "No"} />
            {req.jdLink && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500">JD Link</span>
                <a href={req.jdLink} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 hover:underline truncate">{req.jdLink}</a>
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
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Name" value={req.contactName} />
                <InfoRow label="Role" value={req.contactRole} />
                <InfoRow label="Email" value={req.contactEmail} />
                <InfoRow label="Phone" value={req.contactPhone} />
                <InfoRow label="LinkedIn" value={req.contactLinkedIn} />
              </div>
            </div>
          )}

          {/* Pipeline entries */}
          {req.pipelineEntries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Pipeline ({req.pipelineEntries.length} candidates)
              </h3>
              <div className="space-y-2">
                {req.pipelineEntries.map((pe: any) => (
                  <div key={pe.id} className="flex items-center justify-between text-sm">
                    <Link href={`/candidates/${pe.candidate.id}`} className="text-blue-600 hover:underline">
                      {pe.candidate.name}
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-gray-500 block">{label}</span>
      <span className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</span>
    </div>
  );
}

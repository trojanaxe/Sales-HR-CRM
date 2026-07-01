"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Requirement {
  id: string;
  reqId: string;
  status: string;
  priority: string;
  dateAdded: string;
  clientGroup: string;
  jobRole: string;
  location: string | null;
  assignedHR: { id: string; name: string } | null;
  sdr: { id: string; name: string };
  contractMode: { label: string } | null;
  _count: { pipelineEntries: number };
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  in_progress: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  on_hold: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  closed_won: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  closed_lost: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  medium: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const inputCls = "glass-input px-3 py-2 text-sm w-full";

export default function RequirementsClient({ userRole, userId }: { userRole: string; userId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "");
  const [unclaimed, setUnclaimed] = useState(searchParams.get("unclaimed") === "true");
  const [clientSearch, setClientSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (unclaimed) params.set("unclaimed", "true");
    if (clientSearch) params.set("clientGroup", clientSearch);
    const res = await fetch(`/api/requirements?${params}`);
    const data = await res.json();
    setRequirements(data);
    setLoading(false);
  }, [status, priority, unclaimed, clientSearch]);

  useEffect(() => { load(); }, [load]);

  async function claim(id: string) {
    const res = await fetch(`/api/requirements/${id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      toast.success("Requirement claimed");
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to claim");
    }
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    window.open(`/api/export?type=requirements&${params}`, "_blank");
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Requirements</h1>
          <p className="text-xs text-white/40 mt-0.5">{requirements.length} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Export CSV
          </button>
          {userRole !== "hr" && (
            <Link
              href="/requirements/new"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
            >
              + New
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-4" style={glassStyle}>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            placeholder="Search client group…"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className={`${inputCls} w-52`}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} w-44`}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {userRole !== "sales" && (
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer hover:text-white/80 transition-colors select-none">
              <input
                type="checkbox"
                checked={unclaimed}
                onChange={(e) => setUnclaimed(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              Unclaimed only
            </label>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={glassStyle}>
        {loading ? (
          <div className="p-10 text-center text-sm text-white/30 flex items-center justify-center gap-3">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        ) : requirements.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">No requirements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <tr>
                  {["ID", "Client", "Role", "Priority", "Status", "Assigned HR", "SDR", "Pipeline", "Added", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requirements.map((req, i) => (
                  <tr
                    key={req.id}
                    className="transition-colors duration-150"
                    style={{
                      borderBottom: i < requirements.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3 font-mono text-indigo-400 text-xs font-semibold">
                      <Link href={`/requirements/${req.id}`} className="hover:text-indigo-300 transition-colors">
                        {req.reqId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{req.clientGroup}</td>
                    <td className="px-4 py-3 text-white/70">{req.jobRole}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PRIORITY_BADGE[req.priority] ?? "bg-white/10 text-white/60"}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[req.status] ?? "bg-white/10 text-white/60"}`}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {req.assignedHR ? req.assignedHR.name : (
                        <span className="text-amber-400 font-semibold">Unclaimed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{req.sdr.name}</td>
                    <td className="px-4 py-3 text-white/60">{req._count.pipelineEntries}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(req.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 items-center">
                        <Link href={`/requirements/${req.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                          View
                        </Link>
                        {userRole === "hr" && !req.assignedHR && (
                          <button
                            onClick={() => claim(req.id)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
                          >
                            Claim
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

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

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export default function RequirementsClient({
  userRole,
  userId,
}: {
  userRole: string;
  userId: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "");
  const [unclaimed, setUnclaimed] = useState(
    searchParams.get("unclaimed") === "true"
  );
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

  useEffect(() => {
    load();
  }, [load]);

  async function claim(id: string) {
    const res = await fetch(`/api/requirements/${id}/claim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Requirements</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
          {userRole !== "hr" && (
            <Link
              href="/requirements/new"
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + New
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <input
          placeholder="Search client group…"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-52"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {userRole !== "sales" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unclaimed}
              onChange={(e) => setUnclaimed(e.target.checked)}
              className="rounded"
            />
            Unclaimed only
          </label>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : requirements.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No requirements found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned HR</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">SDR</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Pipeline</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-600">
                      <Link href={`/requirements/${req.id}`} className="hover:underline">
                        {req.reqId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{req.clientGroup}</td>
                    <td className="px-4 py-3 text-gray-700">{req.jobRole}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {req.assignedHR ? (
                        req.assignedHR.name
                      ) : (
                        <span className="text-orange-500 font-medium">Unclaimed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{req.sdr.name}</td>
                    <td className="px-4 py-3 text-gray-600">{req._count.pipelineEntries}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(req.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/requirements/${req.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                        {userRole === "hr" && !req.assignedHR && (
                          <button
                            onClick={() => claim(req.id)}
                            className="text-xs text-green-600 hover:underline font-medium"
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

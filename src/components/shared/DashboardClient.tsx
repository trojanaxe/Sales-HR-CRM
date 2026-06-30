"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalRequirements: number;
  openRequirements: number;
  unclaimedRequirements: number;
  totalCandidates: number;
  placementsThisMonth: number;
  pipelineSummary: { stageName: string; count: number }[];
  reqsByPriority: { priority: string; _count: number }[];
  reqsByStatus: { status: string; _count: number }[];
}

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

export default function DashboardClient({
  user,
}: {
  user: { id: string; name: string; role: string };
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading dashboard…</div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{user.role} Dashboard</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requirements" value={stats?.totalRequirements ?? 0} />
        <StatCard
          label="Open Requirements"
          value={stats?.openRequirements ?? 0}
          color="text-blue-600"
        />
        {user.role !== "sales" && (
          <StatCard
            label="Unclaimed"
            value={stats?.unclaimedRequirements ?? 0}
            color={
              (stats?.unclaimedRequirements ?? 0) > 0
                ? "text-orange-500"
                : "text-gray-700"
            }
            href="/requirements?unclaimed=true"
          />
        )}
        <StatCard
          label="Placements This Month"
          value={stats?.placementsThisMonth ?? 0}
          color="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline summary */}
        {user.role !== "sales" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Pipeline by Stage
            </h2>
            {stats?.pipelineSummary.length === 0 ? (
              <p className="text-sm text-gray-400">No pipeline entries yet.</p>
            ) : (
              <div className="space-y-2">
                {stats?.pipelineSummary.map((s) => (
                  <div key={s.stageName} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{s.stageName}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requirements by priority */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Requirements by Priority
          </h2>
          {stats?.reqsByPriority.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats?.reqsByPriority.map((r) => (
                <div key={r.priority} className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[r.priority] || "bg-gray-100 text-gray-600"}`}
                  >
                    {r.priority}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {r._count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requirements by status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Requirements by Status
          </h2>
          {stats?.reqsByStatus.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats?.reqsByStatus.map((r) => (
                <div key={r.status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {r._count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          {user.role !== "hr" && (
            <Link
              href="/requirements/new"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Requirement
            </Link>
          )}
          {user.role !== "sales" && (
            <>
              <Link
                href="/candidates/new"
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                + New Candidate
              </Link>
              <Link
                href="/requirements?unclaimed=true"
                className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
              >
                View Unclaimed Requirements
              </Link>
            </>
          )}
          <Link
            href="/requirements"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            All Requirements
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-gray-900",
  href,
}: {
  label: string;
  value: number;
  color?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

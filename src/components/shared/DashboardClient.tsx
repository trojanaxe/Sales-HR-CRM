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

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  medium: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  on_hold: "On Hold",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  in_progress: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  on_hold: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  closed_won: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  closed_lost: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
};

const glassCard = "rounded-2xl p-5";
const glassCardStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

export default function DashboardClient({ user }: { user: { id: string; name: string; role: string } }) {
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
        <div className="flex items-center gap-3 text-white/40 text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading dashboard…
        </div>
      </div>
    );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Welcome back, <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">{user.name.split(" ")[0]}</span>
        </h1>
        <p className="text-sm text-white/40 mt-1 capitalize">{user.role} Dashboard</p>
      </div>

      {/* Key metrics — every card is clickable and opens the filtered
          records it represents, respecting the viewer's own role scope
          (the underlying /api/requirements and /api/pipeline routes already
          scope results by role, so these links can't leak data). */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requirements"
          value={stats?.totalRequirements ?? 0}
          icon="📋"
          gradient="from-indigo-600/20 to-indigo-600/5"
          valueColor="text-white"
          href="/requirements"
        />
        <StatCard
          label="Open Requirements"
          value={stats?.openRequirements ?? 0}
          icon="🟢"
          gradient="from-sky-600/20 to-sky-600/5"
          valueColor="text-sky-300"
          href="/requirements?status=new"
        />
        {user.role !== "sales" && (
          <StatCard
            label="Unclaimed"
            value={stats?.unclaimedRequirements ?? 0}
            icon="⚠️"
            gradient={
              (stats?.unclaimedRequirements ?? 0) > 0
                ? "from-amber-600/20 to-amber-600/5"
                : "from-slate-600/20 to-slate-600/5"
            }
            valueColor={
              (stats?.unclaimedRequirements ?? 0) > 0 ? "text-amber-300" : "text-white/60"
            }
            href="/requirements?unclaimed=true"
          />
        )}
        <StatCard
          label="Placements This Month"
          value={stats?.placementsThisMonth ?? 0}
          icon="🏆"
          gradient="from-emerald-600/20 to-emerald-600/5"
          valueColor="text-emerald-300"
          href="/pipeline"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline summary */}
        {user.role !== "sales" && (
          <div className={glassCard} style={glassCardStyle}>
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Pipeline by Stage</h2>
            {stats?.pipelineSummary.length === 0 ? (
              <p className="text-sm text-white/30">No pipeline entries yet.</p>
            ) : (
              <div className="space-y-2.5">
                {stats?.pipelineSummary.map((s) => (
                  <Link key={s.stageName} href="/pipeline" className="flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer">
                    <span className="text-sm text-white/70">{s.stageName}</span>
                    <span className="text-sm font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full">{s.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requirements by priority */}
        <div className={glassCard} style={glassCardStyle}>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">By Priority</h2>
          {stats?.reqsByPriority.length === 0 ? (
            <p className="text-sm text-white/30">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats?.reqsByPriority.map((r) => (
                <Link key={r.priority} href={`/requirements?priority=${r.priority}`} className="flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${PRIORITY_BADGE[r.priority] ?? "bg-white/10 text-white/60"}`}>
                    {r.priority}
                  </span>
                  <span className="text-sm font-bold text-white">{r._count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Requirements by status */}
        <div className={glassCard} style={glassCardStyle}>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">By Status</h2>
          {stats?.reqsByStatus.length === 0 ? (
            <p className="text-sm text-white/30">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats?.reqsByStatus.map((r) => (
                <Link key={r.status} href={`/requirements?status=${r.status}`} className="flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[r.status] ?? "bg-white/10 text-white/60"}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  <span className="text-sm font-bold text-white">{r._count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className={glassCard} style={glassCardStyle}>
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {user.role !== "hr" && (
            <Link
              href="/requirements/new"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
            >
              + New Requirement
            </Link>
          )}
          {user.role !== "sales" && (
            <>
              <Link
                href="/candidates/new"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}
              >
                + New Candidate
              </Link>
              <Link
                href="/requirements?unclaimed=true"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}
              >
                Unclaimed Requirements
              </Link>
            </>
          )}
          <Link
            href="/requirements"
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
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
  icon,
  gradient,
  valueColor,
  href,
}: {
  label: string;
  value: number;
  icon: string;
  gradient: string;
  valueColor: string;
  href?: string;
}) {
  const content = (
    <div
      className="rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100`} />
      <div className="relative">
        <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-4xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

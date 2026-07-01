"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import ScreeningModal from "./ScreeningModal";

interface Stage {
  id: string;
  name: string;
  order: number;
}

interface PipelineEntry {
  id: string;
  candidate: { id: string; name: string; skills: string[]; experience: number | null; currentLocation: string | null };
  requirement: { id: string; reqId: string; clientGroup: string; jobRole: string; priority: string };
  stage: Stage;
  submissionDate: string | null;
  interviewDates: { scheduledAt: string; label: string | null }[];
  notes: { body: string; author: { name: string }; createdAt: string }[];
}

const PRIORITY_ACCENT: Record<string, string> = {
  high: "rgba(244,63,94,0.6)",
  medium: "rgba(245,158,11,0.6)",
  low: "rgba(52,211,153,0.6)",
};

const PRIORITY_GLOW: Record<string, string> = {
  high: "rgba(244,63,94,0.15)",
  medium: "rgba(245,158,11,0.15)",
  low: "rgba(52,211,153,0.15)",
};

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

export default function PipelineKanban({ userRole, userId }: { userRole: string; userId: string }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reqFilter, setReqFilter] = useState("");
  const [screeningEntry, setScreeningEntry] = useState<PipelineEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stagesRes, entriesRes] = await Promise.all([
      fetch("/api/pipeline/stages"),
      fetch("/api/pipeline"),
    ]);
    const [stagesData, entriesData] = await Promise.all([stagesRes.json(), entriesRes.json()]);
    setStages(stagesData);
    setEntries(entriesData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function moveStage(entryId: string, stageId: string) {
    const res = await fetch(`/api/pipeline/${entryId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    if (res.ok) {
      toast.success("Stage updated");
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, stage: stages.find((s) => s.id === stageId)! } : e))
      );
    } else {
      toast.error("Failed to update stage");
    }
  }

  const filtered = reqFilter
    ? entries.filter(
        (e) =>
          e.requirement.reqId.toLowerCase().includes(reqFilter.toLowerCase()) ||
          e.requirement.clientGroup.toLowerCase().includes(reqFilter.toLowerCase())
      )
    : entries;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-sm gap-3">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading pipeline…
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pipeline</h1>
          <p className="text-xs text-white/40 mt-0.5">{filtered.length} entries</p>
        </div>
        <button
          onClick={() => window.open("/api/export?type=pipeline", "_blank")}
          className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <input
          placeholder="Filter by Req ID or client…"
          value={reqFilter}
          onChange={(e) => setReqFilter(e.target.value)}
          className="glass-input px-3 py-2 text-sm w-64"
        />
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageEntries = filtered.filter((e) => e.stage.id === stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-64">
              {/* Column header */}
              <div
                className="flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">{stage.name}</h3>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white/70"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  {stageEntries.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2.5">
                {stageEntries.map((entry) => (
                  <KanbanCard
                    key={entry.id}
                    entry={entry}
                    stages={stages}
                    onMove={(stageId) => moveStage(entry.id, stageId)}
                    onScreening={() => setScreeningEntry(entry)}
                  />
                ))}
                {stageEntries.length === 0 && (
                  <div
                    className="rounded-xl p-4 text-center text-xs text-white/20"
                    style={{ border: "2px dashed rgba(255,255,255,0.08)" }}
                  >
                    No candidates
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {screeningEntry && (
        <ScreeningModal
          pipelineEntry={screeningEntry}
          onClose={() => setScreeningEntry(null)}
        />
      )}
    </div>
  );
}

function KanbanCard({
  entry,
  stages,
  onMove,
  onScreening,
}: {
  entry: PipelineEntry;
  stages: Stage[];
  onMove: (stageId: string) => void;
  onScreening: () => void;
}) {
  const upcomingInterview = entry.interviewDates.find(
    (d) => new Date(d.scheduledAt) >= new Date()
  );
  const accent = PRIORITY_ACCENT[entry.requirement.priority] ?? "rgba(99,102,241,0.6)";
  const glow = PRIORITY_GLOW[entry.requirement.priority] ?? "rgba(99,102,241,0.1)";

  return (
    <div
      className="rounded-xl p-3 transition-all duration-200"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid rgba(255,255,255,0.10)`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: `0 4px 16px ${glow}`,
      }}
    >
      <div className="mb-1">
        <Link
          href={`/candidates/${entry.candidate.id}`}
          className="text-sm font-semibold text-white hover:text-indigo-300 leading-tight transition-colors"
        >
          {entry.candidate.name}
        </Link>
      </div>
      <Link
        href={`/requirements/${entry.requirement.id}`}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors block mb-2"
      >
        {entry.requirement.reqId} · {entry.requirement.clientGroup}
      </Link>
      <div className="flex flex-wrap gap-1 mb-2">
        {entry.candidate.skills.slice(0, 2).map((s) => (
          <span
            key={s}
            className="px-1.5 py-0.5 rounded text-xs text-white/50"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            {s}
          </span>
        ))}
      </div>
      {upcomingInterview && (
        <div className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {upcomingInterview.label || "Interview"}: {new Date(upcomingInterview.scheduledAt).toLocaleDateString()}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <select
          value={entry.stage.id}
          onChange={(e) => onMove(e.target.value)}
          className="glass-input text-xs px-2 py-1 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={onScreening}
          className="text-xs text-violet-400 hover:text-violet-300 font-semibold whitespace-nowrap transition-colors cursor-pointer"
        >
          Screen
        </button>
      </div>
    </div>
  );
}

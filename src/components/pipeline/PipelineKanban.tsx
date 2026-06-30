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

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-l-red-400",
  medium: "border-l-yellow-400",
  low: "border-l-green-400",
};

export default function PipelineKanban({
  userRole,
  userId,
}: {
  userRole: string;
  userId: string;
}) {
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

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading pipeline…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.open("/api/export?type=pipeline", "_blank")}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          placeholder="Filter by Req ID or client…"
          value={reqFilter}
          onChange={(e) => setReqFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56"
        />
        <span className="text-sm text-gray-500 self-center">
          {filtered.length} entries
        </span>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageEntries = filtered.filter((e) => e.stage.id === stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">{stage.name}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {stageEntries.length}
                </span>
              </div>
              <div className="space-y-2">
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
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
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

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${PRIORITY_COLORS[entry.requirement.priority]} rounded-lg p-3 shadow-sm`}>
      <div className="flex items-start justify-between mb-1">
        <Link href={`/candidates/${entry.candidate.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 leading-tight">
          {entry.candidate.name}
        </Link>
      </div>
      <Link href={`/requirements/${entry.requirement.id}`} className="text-xs text-blue-600 hover:underline block mb-2">
        {entry.requirement.reqId} · {entry.requirement.clientGroup}
      </Link>
      {entry.candidate.skills.slice(0, 2).map((s) => (
        <span key={s} className="mr-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
          {s}
        </span>
      ))}
      {upcomingInterview && (
        <div className="mt-2 text-xs text-orange-600 font-medium">
          📅 {upcomingInterview.label || "Interview"}: {new Date(upcomingInterview.scheduledAt).toLocaleDateString()}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-1">
        <select
          value={entry.stage.id}
          onChange={(e) => onMove(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={onScreening}
          className="text-xs text-purple-600 hover:underline whitespace-nowrap"
          title="HR Screening"
        >
          Screen
        </button>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Candidate {
  id: string;
  candidateId: string;
  name: string;
  skills: string[];
  experience: number | null;
}

const glass = {
  background: "rgba(15,15,40,0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

export default function SubmitCandidatesModal({
  requirementId,
  onClose,
  onSubmitted,
}: {
  requirementId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((d) => { setCandidates(d); setFetching(false); });
  }, []);

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) { toast.error("Select at least one candidate"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: Array.from(selected),
          requirementId,
          notes: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(`${selected.size} candidate(s) submitted to pipeline`);
      onSubmitted();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" style={{ ...glass, boxShadow: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-semibold text-white">Submit Candidates to Pipeline</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors cursor-pointer">×</button>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm"
          />
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {fetching ? (
            <p className="text-sm text-white/30 text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">No candidates found.</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <label
                  key={c.id}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
                  style={
                    selected.has(c.id)
                      ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)" }
                      : { background: "transparent", border: "1px solid transparent" }
                  }
                  onMouseEnter={(e) => {
                    if (!selected.has(c.id)) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!selected.has(c.id)) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-0.5 rounded accent-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85">{c.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {c.experience != null ? `${c.experience}y exp` : ""}
                      {c.skills.length > 0 && ` · ${c.skills.slice(0, 3).join(", ")}${c.skills.length > 3 ? ` +${c.skills.length - 3}` : ""}`}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <textarea
            placeholder="Optional note for all submitted candidates…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="glass-input w-full px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-xl text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || selected.size === 0}
                className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                {loading ? "Submitting…" : `Submit${selected.size > 0 ? ` ${selected.size}` : ""} Candidate(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

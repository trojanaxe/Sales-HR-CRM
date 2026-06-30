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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Submit Candidates to Pipeline</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {fetching ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No candidates found.</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selected.has(c.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="mt-0.5 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.experience != null ? `${c.experience}y exp` : ""}
                      {c.skills.length > 0 && ` · ${c.skills.slice(0, 3).join(", ")}${c.skills.length > 3 ? ` +${c.skills.length - 3}` : ""}`}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 space-y-3">
          <textarea
            placeholder="Optional note for all submitted candidates…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={submit}
                disabled={loading || selected.size === 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? "Submitting…" : `Submit ${selected.size > 0 ? selected.size : ""} Candidate(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

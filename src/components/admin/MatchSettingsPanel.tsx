"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

export default function MatchSettingsPanel() {
  const [minMatchScore, setMinMatchScore] = useState(70);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/match-settings");
    if (res.ok) setMinMatchScore((await res.json()).minMatchScore);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/match-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minMatchScore }),
    });
    if (res.ok) toast.success("Match threshold saved");
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setSaving(false);
  }

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <h2 className="text-sm font-semibold text-white/70">JD Matching Threshold</h2>
        <p className="text-xs text-white/40 mt-0.5">
          Minimum match score for a candidate to appear in JD Candidate Matching results.
          This is a screening aid, not an automatic filter — recruiters can still review any
          candidate&apos;s detailed match breakdown regardless of score.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-white/30 py-6 text-center">Loading…</div>
      ) : (
        <div className="rounded-2xl p-5" style={glassStyle}>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
            Minimum Match Score
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              className="glass-input w-20 px-2 py-1.5 text-sm text-center"
            />
            <span className="text-sm text-white/50">%</span>
          </div>
          <p className="text-xs text-white/30 mt-3">
            Default is 70% (&ldquo;Potential Match&rdquo; and above). Lower this if too few candidates are
            surfacing for a role; raise it if too many low-relevance results show up.
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50 transition-all duration-200"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

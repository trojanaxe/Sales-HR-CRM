"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface AdhocJDSummary {
  id: string;
  title: string | null;
  jobTitle: string | null;
  createdAt: string;
  parsedAt: string | null;
  requiredSkills: string[];
  createdBy: { name: string };
}

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const inputCls = "glass-input w-full px-3 py-2 text-sm";

export default function JDMatchingClient() {
  const router = useRouter();
  const [searches, setSearches] = useState<AdhocJDSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/jd-matching");
    if (res.ok) setSearches(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteSearch(s: AdhocJDSummary) {
    const label = s.title || s.jobTitle || "this JD search";
    const confirmed = window.confirm(
      `Are you sure you want to delete "${label}"? This action will remove the saved matching session. Candidates, resumes, and requirements are not affected.`
    );
    if (!confirmed) return;
    const res = await fetch(`/api/jd-matching/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("JD matching result deleted");
      setSearches((prev) => prev.filter((x) => x.id !== s.id));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Failed to delete");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!jdText.trim() && !file) {
      toast.error("Paste JD text or upload a JD file");
      return;
    }
    setSubmitting(true);
    let res: Response;
    if (file) {
      const fd = new FormData();
      if (title) fd.append("title", title);
      if (jdText) fd.append("jdText", jdText);
      fd.append("jd", file);
      res = await fetch("/api/jd-matching", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/jd-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, jdText }),
      });
    }
    if (res.ok) {
      const created = await res.json();
      toast.success("JD parsed — showing matches");
      router.push(`/jd-matching/${created.id}`);
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to parse JD");
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">JD Candidate Matching</h1>
          <p className="text-xs text-white/40 mt-0.5">
            Paste or upload a JD and search the entire resume database for matching candidates.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
        >
          {showForm ? "Close" : "+ New JD Search"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={glassStyle}>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
              Title (optional)
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Full Stack Engineer — Acme Corp" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
              JD Text
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={8}
              maxLength={20000}
              placeholder="Paste the job description here…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
              Or upload a JD file
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm text-white/60"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50 transition-all duration-200"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
          >
            {submitting ? "Parsing…" : "Parse & Find Matches"}
          </button>
        </form>
      )}

      <div className="rounded-2xl overflow-hidden" style={glassStyle}>
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Search History</h3>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-white/30">Loading…</div>
        ) : searches.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">
            No JD searches yet. Start one above.
          </div>
        ) : (
          <div>
            {searches.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-white/[0.04]"
                style={{ borderBottom: i < searches.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
              >
                <Link href={`/jd-matching/${s.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{s.title || s.jobTitle || "Untitled JD"}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString()} · {s.createdBy.name} · {s.requiredSkills.length} required skill(s)
                  </p>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/jd-matching/${s.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View Matches →</Link>
                  <button
                    onClick={() => deleteSearch(s)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

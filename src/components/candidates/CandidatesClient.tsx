"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Candidate {
  id: string;
  candidateId: string;
  name: string;
  email: string | null;
  phone: string | null;
  currentLocation: string | null;
  skills: string[];
  experience: number | null;
  visaStatus: string | null;
  source: string;
  owner: { name: string };
  _count: { pipelineEntries: number };
}

const SKILL_BADGE = [
  "bg-sky-500/20 text-sky-300 border border-sky-500/25",
  "bg-violet-500/20 text-violet-300 border border-violet-500/25",
  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/25",
  "bg-amber-500/20 text-amber-300 border border-amber-500/25",
];

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const inputCls = "glass-input px-3 py-2 text-sm";

export default function CandidatesClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillLogic, setSkillLogic] = useState("AND");
  const [minExp, setMinExp] = useState("");
  const [maxExp, setMaxExp] = useState("");
  const [source, setSource] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (minExp) params.set("minExp", minExp);
    if (maxExp) params.set("maxExp", maxExp);
    if (source) params.set("source", source);
    if (skillLogic) params.set("skillLogic", skillLogic);
    selectedSkills.forEach((s) => params.append("skill", s));
    const res = await fetch(`/api/candidates?${params}`);
    const data = await res.json();
    setCandidates(data);
    setLoading(false);
  }, [search, minExp, maxExp, source, selectedSkills, skillLogic]);

  useEffect(() => { load(); }, [load]);

  function addSkill() {
    const s = skillInput.trim();
    if (s && !selectedSkills.includes(s)) setSelectedSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setSelectedSkills((prev) => prev.filter((x) => x !== s));
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Candidates</h1>
          <p className="text-xs text-white/40 mt-0.5">{candidates.length} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open("/api/export?type=candidates", "_blank")}
            className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Export CSV
          </button>
          <Link
            href="/candidates/new"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
          >
            + New
          </Link>
        </div>
      </div>

      {/* Search & filters */}
      <div className="rounded-2xl p-4 space-y-3" style={glassStyle}>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} w-56`}
          />
          <select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">All Sources</option>
            <option value="bench">Bench</option>
            <option value="external">External</option>
            <option value="referral">Referral</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              placeholder="Min"
              type="number"
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
              className={`${inputCls} w-20`}
            />
            <span className="text-white/30 text-sm">–</span>
            <input
              placeholder="Max"
              type="number"
              value={maxExp}
              onChange={(e) => setMaxExp(e.target.value)}
              className={`${inputCls} w-20`}
            />
            <span className="text-xs text-white/40">yrs exp</span>
          </div>
        </div>

        {/* Skill filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1">
            <input
              placeholder="Add skill filter…"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              className={`${inputCls} w-44`}
            />
            <button
              onClick={addSkill}
              className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              +
            </button>
          </div>
          {selectedSkills.length > 1 && (
            <select
              value={skillLogic}
              onChange={(e) => setSkillLogic(e.target.value)}
              className={`${inputCls} w-32 text-xs`}
            >
              <option value="AND">Match ALL</option>
              <option value="OR">Match ANY</option>
            </select>
          )}
          {selectedSkills.map((s, i) => (
            <span
              key={s}
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${SKILL_BADGE[i % SKILL_BADGE.length]}`}
            >
              {s}
              <button onClick={() => removeSkill(s)} className="hover:text-rose-400 transition-colors cursor-pointer">×</button>
            </span>
          ))}
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
        ) : candidates.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">No candidates found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <tr>
                  {["ID", "Name", "Location", "Skills", "Exp", "Visa", "Source", "Owner", "Pipeline", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr
                    key={c.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: i < candidates.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/40">{c.candidateId}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="font-semibold text-white hover:text-indigo-300 transition-colors">
                        {c.name}
                      </Link>
                      {c.email && <div className="text-xs text-white/35">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-white/60">{c.currentLocation || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 3).map((s, idx) => (
                          <span key={s} className={`px-2 py-0.5 rounded-full text-xs font-medium ${SKILL_BADGE[idx % SKILL_BADGE.length]}`}>{s}</span>
                        ))}
                        {c.skills.length > 3 && (
                          <span className="text-xs text-white/35">+{c.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{c.experience != null ? `${c.experience}y` : "—"}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{c.visaStatus || "—"}</td>
                    <td className="px-4 py-3 text-white/60 capitalize">{c.source}</td>
                    <td className="px-4 py-3 text-white/60">{c.owner.name}</td>
                    <td className="px-4 py-3 text-white/60">{c._count.pipelineEntries}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">View</Link>
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

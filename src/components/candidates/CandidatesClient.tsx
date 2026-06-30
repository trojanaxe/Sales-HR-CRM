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

const SKILL_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
];

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
    if (s && !selectedSkills.includes(s)) {
      setSelectedSkills((prev) => [...prev, s]);
    }
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setSelectedSkills((prev) => prev.filter((x) => x !== s));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.open("/api/export?type=candidates", "_blank")}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
          <Link
            href="/candidates/new"
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + New
          </Link>
        </div>
      </div>

      {/* Search & filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All Sources</option>
            <option value="bench">Bench</option>
            <option value="external">External</option>
            <option value="referral">Referral</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              placeholder="Min Exp"
              type="number"
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              placeholder="Max Exp"
              type="number"
              value={maxExp}
              onChange={(e) => setMaxExp(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20"
            />
            <span className="text-xs text-gray-500">yrs</span>
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
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44"
            />
            <button
              onClick={addSkill}
              className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-sm rounded-lg hover:bg-gray-200"
            >
              +
            </button>
          </div>
          {selectedSkills.length > 1 && (
            <select
              value={skillLogic}
              onChange={(e) => setSkillLogic(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            >
              <option value="AND">Match ALL</option>
              <option value="OR">Match ANY</option>
            </select>
          )}
          {selectedSkills.map((s, i) => (
            <span
              key={s}
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${SKILL_COLORS[i % SKILL_COLORS.length]}`}
            >
              {s}
              <button onClick={() => removeSkill(s)} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No candidates found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Skills</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Exp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Visa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Pipeline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.candidateId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/candidates/${c.id}`} className="hover:text-blue-600">
                        {c.name}
                      </Link>
                      {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.currentLocation || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 3).map((s, i) => (
                          <span key={s} className={`px-1.5 py-0.5 rounded text-xs ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>{s}</span>
                        ))}
                        {c.skills.length > 3 && (
                          <span className="text-xs text-gray-400">+{c.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.experience != null ? `${c.experience}y` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.visaStatus || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{c.source}</td>
                    <td className="px-4 py-3 text-gray-600">{c.owner.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c._count.pipelineEntries}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
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

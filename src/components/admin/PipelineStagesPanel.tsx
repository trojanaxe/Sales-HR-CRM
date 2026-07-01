"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

export default function PipelineStagesPanel() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    const res = await fetch("/api/admin/pipeline-stages");
    if (res.ok) setStages(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/pipeline-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) { toast.success("Stage added"); setNewName(""); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setAdding(false);
  }

  async function update(id: string, data: Partial<PipelineStage>) {
    const res = await fetch("/api/admin/pipeline-stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (res.ok) { load(); setEditingId(null); }
    else toast.error("Failed");
  }

  async function moveUp(stage: PipelineStage) {
    const above = stages.find((s) => s.order === stage.order - 1);
    if (!above) return;
    await Promise.all([
      update(stage.id, { order: stage.order - 1 }),
      update(above.id, { order: above.order + 1 }),
    ]);
  }

  async function moveDown(stage: PipelineStage) {
    const below = stages.find((s) => s.order === stage.order + 1);
    if (!below) return;
    await Promise.all([
      update(stage.id, { order: stage.order + 1 }),
      update(below.id, { order: below.order - 1 }),
    ]);
  }

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <h2 className="text-sm font-semibold text-white/70">Pipeline Stages</h2>
        <p className="text-xs text-white/40 mt-0.5">Manage and reorder stages that candidates move through.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New stage name"
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="glass-input flex-1 px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          disabled={adding || !newName.trim()}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50 transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          Add
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-white/30 py-6 text-center">Loading…</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glassStyle}>
          {stages.length === 0 ? (
            <p className="px-4 py-8 text-sm text-white/30 text-center">No stages configured.</p>
          ) : (
            <ul>
              {stages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-150"
                    style={{ borderBottom: i < stages.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveUp(s)}
                        disabled={s.order === 1}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20 text-xs leading-none cursor-pointer transition-colors"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(s)}
                        disabled={s.order === stages.length}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20 text-xs leading-none cursor-pointer transition-colors"
                      >
                        ▼
                      </button>
                    </div>

                    <span className="text-xs text-white/30 w-5 font-mono">{s.order}</span>

                    {editingId === s.id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="glass-input flex-1 px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button onClick={() => update(s.id, { name: editName })} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-medium ${s.isActive ? "text-white" : "text-white/30 line-through"}`}>
                          {s.name}
                        </span>
                        <button
                          onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => update(s.id, { isActive: !s.isActive })}
                          className="text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer transition-all duration-200"
                          style={
                            s.isActive
                              ? { background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }
                              : { background: "rgba(244,63,94,0.15)", color: "#fda4af", border: "1px solid rgba(244,63,94,0.3)" }
                          }
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </button>
                      </>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

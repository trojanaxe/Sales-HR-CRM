"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

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
      <h2 className="text-base font-semibold text-gray-800">Pipeline Stages</h2>
      <p className="text-sm text-gray-500">Manage stages that candidates move through in the pipeline.</p>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New stage name"
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <button
          onClick={add}
          disabled={adding || !newName.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {stages.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No stages configured.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveUp(s)}
                        disabled={s.order === 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(s)}
                        disabled={s.order === stages.length}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>

                    <span className="text-xs text-gray-400 w-5">{s.order}</span>

                    {editingId === s.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-sm"
                          autoFocus
                        />
                        <button onClick={() => update(s.id, { name: editName })} className="text-xs text-blue-600 hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-medium ${s.isActive ? "text-gray-900" : "text-gray-400 line-through"}`}>
                          {s.name}
                        </span>
                        <button
                          onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => update(s.id, { isActive: !s.isActive })}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.isActive
                              ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                              : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                          }`}
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

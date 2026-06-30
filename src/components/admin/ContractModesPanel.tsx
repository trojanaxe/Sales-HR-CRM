"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ContractMode {
  id: string;
  label: string;
  isActive: boolean;
}

export default function ContractModesPanel() {
  const [modes, setModes] = useState<ContractMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/contract-modes");
    if (res.ok) setModes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/contract-modes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newName.trim() }),
    });
    if (res.ok) { toast.success("Added"); setNewName(""); load(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setAdding(false);
  }

  async function toggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/contract-modes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    if (res.ok) load();
    else toast.error("Failed");
  }

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="text-base font-semibold text-gray-800">Contract Modes</h2>
      <p className="text-sm text-gray-500">Manage the employment contract types available in requirement forms.</p>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. 1099"
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
          {modes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No contract modes.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {modes.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <span className={`text-sm font-medium ${m.isActive ? "text-gray-900" : "text-gray-400 line-through"}`}>
                    {m.label}
                  </span>
                  <button
                    onClick={() => toggle(m.id, m.isActive)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.isActive
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                        : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                    }`}
                  >
                    {m.isActive ? "Active" : "Inactive"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

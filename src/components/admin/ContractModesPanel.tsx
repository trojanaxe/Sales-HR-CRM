"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ContractMode {
  id: string;
  label: string;
  isActive: boolean;
}

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

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
      <div>
        <h2 className="text-sm font-semibold text-white/70">Contract Modes</h2>
        <p className="text-xs text-white/40 mt-0.5">Manage employment contract types for requirement forms.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. 1099"
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
          {modes.length === 0 ? (
            <p className="px-4 py-8 text-sm text-white/30 text-center">No contract modes configured.</p>
          ) : (
            <ul>
              {modes.map((m, i) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors duration-150"
                  style={{ borderBottom: i < modes.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <span className={`text-sm font-medium ${m.isActive ? "text-white" : "text-white/30 line-through"}`}>
                    {m.label}
                  </span>
                  <button
                    onClick={() => toggle(m.id, m.isActive)}
                    className="text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer transition-all duration-200"
                    style={
                      m.isActive
                        ? { background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }
                        : { background: "rgba(244,63,94,0.15)", color: "#fda4af", border: "1px solid rgba(244,63,94,0.3)" }
                    }
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

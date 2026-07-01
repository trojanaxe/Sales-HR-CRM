"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLES = ["admin", "sales", "hr"];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  sales: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  hr: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const inputCls = "glass-input w-full px-3 py-2 text-sm";

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">Team Members</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
        >
          + Add User
        </button>
      </div>

      {showCreate && (
        <UserForm
          onSave={async (data) => {
            const res = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (res.ok) { toast.success("User created"); load(); setShowCreate(false); }
            else { const d = await res.json(); toast.error(d.error || "Failed"); }
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="text-sm text-white/30 py-8 text-center">Loading…</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glassStyle}>
          <table className="w-full text-sm">
            <thead style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <tr>
                {["Name", "Email", "Role", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) =>
                editingId === u.id ? (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td colSpan={5} className="px-4 py-3">
                      <UserForm
                        existing={u}
                        onSave={async (data) => {
                          const res = await fetch(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(data),
                          });
                          if (res.ok) { toast.success("Updated"); load(); setEditingId(null); }
                          else { const d = await res.json(); toast.error(d.error || "Failed"); }
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={u.id}
                    style={{ borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3 font-semibold text-white">{u.name}</td>
                    <td className="px-4 py-3 text-white/50">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[u.role] ?? "bg-white/10 text-white/60"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditingId(u.id)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer">
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserForm({
  existing,
  onSave,
  onCancel,
}: {
  existing?: User;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [role, setRole] = useState(existing?.role ?? "hr");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  function submit() {
    const data: Record<string, unknown> = { name, email, role, isActive };
    if (password) data.password = password;
    onSave(data);
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
            {existing ? "New Password (blank = keep)" : "Password"}
          </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </div>
        {existing && (
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded accent-indigo-500" />
            <label htmlFor="isActive" className="text-sm text-white/70 cursor-pointer">Active</label>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          {existing ? "Update" : "Create"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white cursor-pointer transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

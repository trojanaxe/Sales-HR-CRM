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
        <h2 className="text-base font-semibold text-gray-800">Team Members</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
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
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                editingId === u.id ? (
                  <tr key={u.id}>
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
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" :
                        u.role === "sales" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingId(u.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              ))}
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
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{existing ? "New Password (leave blank to keep)" : "Password"}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        {existing && (
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          {existing ? "Update" : "Create"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}

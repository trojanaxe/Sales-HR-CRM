"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Account {
  id: string;
  accountId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  createdBy: { name: string };
  _count: { contacts: number; requirements: number };
}

const glassStyle = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

export default function AccountsClient({ userRole }: { userRole: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/accounts?${params}`);
    setAccounts(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const canWrite = userRole === "admin" || userRole === "sales";

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Accounts</h1>
          <p className="text-xs text-white/40 mt-0.5">{accounts.length} companies{userRole === "hr" ? " · read-only" : ""}</p>
        </div>
        {canWrite && (
          <Link
            href="/accounts/new"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
          >
            + New Account
          </Link>
        )}
      </div>

      <div className="rounded-2xl p-4" style={glassStyle}>
        <input
          placeholder="Search by name or domain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input px-3 py-2 text-sm w-72"
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={glassStyle}>
        {loading ? (
          <div className="p-10 text-center text-sm text-white/30">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">No accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <tr>
                  {["Account", "Domain", "Industry", "Contacts", "Requirements", "Created By", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr
                    key={a.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: i < accounts.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/accounts/${a.id}`} className="font-semibold text-white hover:text-indigo-300 transition-colors">
                        {a.name}
                      </Link>
                      <span className="block text-xs text-white/30 font-mono">{a.accountId}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{a.domain || "—"}</td>
                    <td className="px-4 py-3 text-white/60">{a.industry || "—"}</td>
                    <td className="px-4 py-3 text-white/60">{a._count.contacts}</td>
                    <td className="px-4 py-3 text-white/60">{a._count.requirements}</td>
                    <td className="px-4 py-3 text-white/40">{a.createdBy.name}</td>
                    <td className="px-4 py-3">
                      <Link href={`/accounts/${a.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        View
                      </Link>
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

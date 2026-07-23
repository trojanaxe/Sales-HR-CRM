"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AccountDuplicateMatch } from "@/lib/accounts/service";

const inputCls = "glass-input w-full px-3 py-2 text-sm";

export default function AccountForm({
  existing,
}: {
  existing?: { id: string; name: string; domain?: string | null; website?: string | null; industry?: string | null; notes?: string | null };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: existing?.name || "",
    domain: existing?.domain || "",
    website: existing?.website || "",
    industry: existing?.industry || "",
    notes: existing?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<AccountDuplicateMatch[] | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(resolution?: { action: "use_existing" | "create_new"; accountId?: string }) {
    if (!form.name.trim()) { toast.error("Account name is required"); return; }
    setLoading(true);
    try {
      const url = existing ? `/api/accounts/${existing.id}` : "/api/accounts";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, resolution }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      if (data.status === "duplicate") { setDuplicates(data.duplicates); return; }
      setDuplicates(null);
      toast.success(existing ? "Account updated" : "Account created");
      const account = data.account || data;
      router.push(`/accounts/${account.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-white/50 hover:text-white/90 transition-colors cursor-pointer">← Back</button>
        <h1 className="text-2xl font-bold text-white tracking-tight">{existing ? "Edit Account" : "New Account"}</h1>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">Company Name <span className="text-rose-400">*</span></label>
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">Domain</label>
          <input className={inputCls} value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="acme.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">Website</label>
          <input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://acme.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">Industry</label>
          <input className={inputCls} value={form.industry} onChange={(e) => set("industry", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">Notes</label>
          <textarea className={inputCls} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
          >
            {loading ? "Saving…" : existing ? "Save Changes" : "Create Account"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 text-sm font-medium text-white/60 hover:text-white rounded-xl transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Cancel
          </button>
        </div>
      </form>

      {duplicates && duplicates.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" style={{ background: "rgba(15,15,40,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 className="text-base font-semibold text-white">Possible existing account</h2>
            <p className="text-sm text-white/50">
              An account matching &ldquo;{form.name}&rdquo; may already exist. Review it, or create a new account anyway.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {duplicates.map((d) => (
                <div key={d.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <p className="text-sm font-medium text-white/85">{d.name}</p>
                    <p className="text-xs text-white/40">{d.accountId} {d.domain ? `· ${d.domain}` : ""} · matched on {d.reasons.join(", ")}</p>
                  </div>
                  <a
                    href={`/accounts/${d.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    View existing
                  </a>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setDuplicates(null)} className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => submit({ action: "create_new" })}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
              >
                None of these — create a new account anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

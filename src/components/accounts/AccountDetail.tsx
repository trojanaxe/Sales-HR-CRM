"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AccountForm from "./AccountForm";

interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
}

interface RequirementRow {
  id: string;
  reqId: string;
  jobRole: string;
  status: string;
  priority: string;
  dateAdded: string;
  sdr: { name: string };
  assignedHR: { name: string } | null;
  contact: { id: string; name: string } | null;
}

interface AccountData {
  id: string;
  accountId: string;
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  createdBy: { name: string };
  contacts: Contact[];
  requirements: RequirementRow[];
  _count: { contacts: number; requirements: number };
}

const glassCard = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  in_progress: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  on_hold: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  closed_won: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  closed_lost: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
};

export default function AccountDetail({ id, userRole }: { id: string; userRole: string }) {
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", role: "", email: "", phone: "", linkedIn: "" });
  const [savingContact, setSavingContact] = useState(false);

  const canWrite = userRole === "admin" || userRole === "sales";

  async function load() {
    const res = await fetch(`/api/accounts/${id}`);
    const data = await res.json();
    if (!res.ok) { toast.error("Not found"); router.push("/accounts"); return; }
    setAccount(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addContact() {
    if (!contactForm.name.trim()) { toast.error("Contact name is required"); return; }
    setSavingContact(true);
    const res = await fetch(`/api/accounts/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    if (res.ok) {
      toast.success("Contact added");
      setContactForm({ name: "", role: "", email: "", phone: "", linkedIn: "" });
      setAddingContact(false);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to add contact");
    }
    setSavingContact(false);
  }

  if (loading) return <div className="p-8 text-white/30 text-sm">Loading…</div>;
  if (!account) return null;

  if (editing) {
    return <AccountForm existing={account} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push("/accounts")} className="text-sm text-white/50 hover:text-white/90 transition-colors mb-2 cursor-pointer">← Back to Accounts</button>
          <h1 className="text-2xl font-bold text-white tracking-tight">{account.name}</h1>
          <p className="text-sm text-white/40 mt-1">{account.accountId} {account.industry ? `· ${account.industry}` : ""}</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Company info */}
          <div className="rounded-2xl p-5 grid grid-cols-2 gap-4" style={glassCard}>
            <InfoRow label="Domain" value={account.domain} />
            <InfoRow label="Website" value={account.website ? <a href={account.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">{account.website}</a> : null} />
            <InfoRow label="Total Requirements" value={String(account._count.requirements)} />
            <InfoRow label="Total Contacts" value={String(account._count.contacts)} />
            <InfoRow label="Created By" value={account.createdBy.name} />
            {account.notes && (
              <div className="col-span-2">
                <InfoRow label="Notes" value={account.notes} />
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="rounded-2xl p-5" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Contacts ({account.contacts.length})</h3>
              {canWrite && (
                <button onClick={() => setAddingContact((v) => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer">
                  {addingContact ? "Cancel" : "+ Add Contact"}
                </button>
              )}
            </div>

            {addingContact && (
              <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="grid grid-cols-2 gap-2">
                  <input className="glass-input px-2.5 py-1.5 text-sm" placeholder="Name *" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} />
                  <input className="glass-input px-2.5 py-1.5 text-sm" placeholder="Role (e.g. CTO)" value={contactForm.role} onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))} />
                  <input className="glass-input px-2.5 py-1.5 text-sm" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} />
                  <input className="glass-input px-2.5 py-1.5 text-sm" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} />
                  <input className="glass-input px-2.5 py-1.5 text-sm col-span-2" placeholder="LinkedIn" value={contactForm.linkedIn} onChange={(e) => setContactForm((p) => ({ ...p, linkedIn: e.target.value }))} />
                </div>
                <button
                  onClick={addContact}
                  disabled={savingContact}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  {savingContact ? "Saving…" : "Save Contact"}
                </button>
              </div>
            )}

            {account.contacts.length === 0 ? (
              <p className="text-sm text-white/30">No contacts yet.</p>
            ) : (
              <div className="space-y-2">
                {account.contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <p className="font-medium text-white/85">{c.name} {c.role && <span className="text-white/40 font-normal">— {c.role}</span>}</p>
                      <p className="text-xs text-white/40">{[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info on file"}</p>
                    </div>
                    {c.linkedIn && (
                      <a href={c.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">LinkedIn</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="rounded-2xl p-5" style={glassCard}>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Requirements ({account.requirements.length})</h3>
            {account.requirements.length === 0 ? (
              <p className="text-sm text-white/30">No requirements yet from this account.</p>
            ) : (
              <div className="space-y-2">
                {account.requirements.map((r) => (
                  <Link key={r.id} href={`/requirements/${r.id}`} className="flex items-center justify-between text-sm rounded-xl p-3 hover:bg-white/[0.04] transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div>
                      <p className="font-medium text-indigo-400">{r.reqId} — {r.jobRole}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        SDR: {r.sdr.name} {r.assignedHR ? `· HR: ${r.assignedHR.name}` : "· Unclaimed"} {r.contact ? `· Contact: ${r.contact.name}` : ""}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? "bg-white/10 text-white/60"}`}>
                      {r.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-white/40 block font-medium uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-sm text-white/80">{value || <span className="text-white/25">—</span>}</span>
    </div>
  );
}

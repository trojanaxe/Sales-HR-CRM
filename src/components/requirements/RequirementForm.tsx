"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { validateRequirementFields, MEETING_STATUS_OPTIONS, NEGOTIABLE_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/requirements/validation";
import type { AccountDuplicateMatch } from "@/lib/accounts/service";

interface ContractMode {
  id: string;
  label: string;
}

interface RequirementData {
  id?: string;
  reqId?: string;
  clientGroup?: string;
  jobRole?: string;
  priority?: string;
  status?: string;
  closingDate?: string;
  vendor?: string;
  contactName?: string;
  contactRole?: string;
  contactLinkedIn?: string;
  contactEmail?: string;
  contactPhone?: string;
  experience?: string;
  budget?: string;
  location?: string;
  contractModeId?: string;
  industry?: string;
  negotiable?: string;
  workMode?: string;
  meetingStatus?: string;
  jdReceived?: boolean;
  jdLink?: string;
  jdText?: string;
  wonLostReason?: string;
}

const inputCls = "glass-input w-full px-3 py-2 text-sm";
const errorInputCls = "glass-input w-full px-3 py-2 text-sm !border-rose-500/60";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

export default function RequirementForm({
  existing,
  readOnly,
}: {
  existing?: RequirementData;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [contractModes, setContractModes] = useState<ContractMode[]>([]);
  const [clientGroups, setClientGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accountDuplicates, setAccountDuplicates] = useState<AccountDuplicateMatch[] | null>(null);

  const [form, setForm] = useState<RequirementData>({
    clientGroup: "",
    jobRole: "",
    priority: "medium",
    status: "new",
    ...existing,
  });

  useEffect(() => {
    fetch("/api/admin/contract-modes")
      .then((r) => r.json())
      .then((d) => setContractModes(d.filter((m: ContractMode & { isActive: boolean }) => m.isActive)));
    fetch("/api/requirements/client-groups")
      .then((r) => r.json())
      .then(setClientGroups);
  }, []);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const filteredGroups = clientGroups.filter(
    (g) =>
      form.clientGroup &&
      g.toLowerCase().includes(form.clientGroup.toLowerCase()) &&
      g !== form.clientGroup
  );

  function runValidation(): boolean {
    const missing = validateRequirementFields(form as Record<string, unknown>);
    if (missing.length === 0) {
      setErrors({});
      return true;
    }
    const FIELD_LABELS: Record<string, string> = {
      "Client Group": "clientGroup", "Job Role": "jobRole", Priority: "priority", Status: "status",
      "Vendor / Company": "vendor", Location: "location", Experience: "experience", "Budget / Rate": "budget",
      "Contract Mode": "contractModeId", Industry: "industry", "Closing Date": "closingDate",
      "Meeting Status": "meetingStatus", "Contact Name": "contactName", "Contact Role": "contactRole",
      "Contact Email": "contactEmail", "Contact Phone": "contactPhone", "Contact LinkedIn": "contactLinkedIn",
      Negotiable: "negotiable", "Work Mode": "workMode", "Won / Lost Reason": "wonLostReason",
    };
    const nextErrors: Record<string, string> = {};
    missing.forEach((label) => {
      const key = FIELD_LABELS[label];
      if (key) nextErrors[key] = `${label} is required`;
    });
    setErrors(nextErrors);
    toast.error(`Please fill in: ${missing.join(", ")}`);
    return false;
  }

  async function submitForm(accountResolution?: { action: "use_existing" | "create_new"; accountId?: string }) {
    setLoading(true);
    try {
      const url = existing?.id ? `/api/requirements/${existing.id}` : "/api/requirements";
      const method = existing?.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountResolution }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      if (data.status === "duplicate_account") {
        setAccountDuplicates(data.duplicates);
        return;
      }
      setAccountDuplicates(null);
      toast.success(existing?.id ? "Requirement updated" : "Requirement created");
      router.push(`/requirements/${data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!runValidation()) return;
    await submitForm();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-white/50 hover:text-white/90 transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {existing?.id ? `Edit ${existing.reqId}` : "New Requirement"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}
      >
        {/* Left: main fields + contact */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Group with autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
                Client Group <span className="text-rose-400">*</span>
              </label>
              <input
                className={errors.clientGroup ? errorInputCls : inputCls}
                value={form.clientGroup || ""}
                onChange={(e) => {
                  set("clientGroup", e.target.value);
                  setShowClientSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
                disabled={readOnly}
              />
              {errors.clientGroup && <p className="text-xs text-rose-400 mt-1">{errors.clientGroup}</p>}
              {showClientSuggestions && filteredGroups.length > 0 && (
                <ul className="absolute z-10 w-full rounded-xl shadow-2xl mt-1 max-h-40 overflow-auto" style={{ background: "rgba(15,15,40,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {filteredGroups.map((g) => (
                    <li
                      key={g}
                      className="px-3 py-2 text-sm text-white/80 hover:bg-indigo-600/30 cursor-pointer transition-colors"
                      onMouseDown={() => {
                        set("clientGroup", g);
                        setShowClientSuggestions(false);
                      }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="Job Role" required error={errors.jobRole}>
              <input
                className={errors.jobRole ? errorInputCls : inputCls}
                value={form.jobRole || ""}
                onChange={(e) => set("jobRole", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Priority" required error={errors.priority}>
              <select
                className={inputCls}
                value={form.priority || "medium"}
                onChange={(e) => set("priority", e.target.value)}
                disabled={readOnly}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>

            <Field label="Status" required error={errors.status}>
              <select
                className={inputCls}
                value={form.status || "new"}
                onChange={(e) => set("status", e.target.value)}
                disabled={readOnly}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </Field>

            <Field label="Vendor / Company" required error={errors.vendor}>
              <input
                className={errors.vendor ? errorInputCls : inputCls}
                value={form.vendor || ""}
                onChange={(e) => set("vendor", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Location" required error={errors.location}>
              <input
                className={errors.location ? errorInputCls : inputCls}
                value={form.location || ""}
                onChange={(e) => set("location", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Experience (e.g. 5-8 years)" required error={errors.experience}>
              <input
                className={errors.experience ? errorInputCls : inputCls}
                value={form.experience || ""}
                onChange={(e) => set("experience", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Budget / Rate" required error={errors.budget}>
              <input
                className={errors.budget ? errorInputCls : inputCls}
                value={form.budget || ""}
                onChange={(e) => set("budget", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Contract Mode" required error={errors.contractModeId}>
              <select
                className={errors.contractModeId ? errorInputCls : inputCls}
                value={form.contractModeId || ""}
                onChange={(e) => set("contractModeId", e.target.value)}
                disabled={readOnly}
              >
                <option value="">— Select —</option>
                {contractModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Industry" required error={errors.industry}>
              <input
                className={errors.industry ? errorInputCls : inputCls}
                value={form.industry || ""}
                onChange={(e) => set("industry", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Closing Date" required error={errors.closingDate}>
              <input
                type="date"
                className={errors.closingDate ? errorInputCls : inputCls}
                value={form.closingDate ? form.closingDate.split("T")[0] : ""}
                onChange={(e) => set("closingDate", e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <Field label="Meeting Status" required error={errors.meetingStatus}>
              <select
                className={errors.meetingStatus ? errorInputCls : inputCls}
                value={form.meetingStatus || ""}
                onChange={(e) => set("meetingStatus", e.target.value)}
                disabled={readOnly}
              >
                <option value="">— Select —</option>
                {MEETING_STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>

            <Field label="Negotiable" required error={errors.negotiable}>
              <select
                className={errors.negotiable ? errorInputCls : inputCls}
                value={form.negotiable || ""}
                onChange={(e) => set("negotiable", e.target.value)}
                disabled={readOnly}
              >
                <option value="">— Select —</option>
                {NEGOTIABLE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                ))}
              </select>
            </Field>

            <Field label="Work Mode" required error={errors.workMode}>
              <select
                className={errors.workMode ? errorInputCls : inputCls}
                value={form.workMode || ""}
                onChange={(e) => set("workMode", e.target.value)}
                disabled={readOnly}
              >
                <option value="">— Select —</option>
                {WORK_MODE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{{ onsite: "On-site", remote: "Remote", hybrid: "Hybrid" }[o]}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Contact section */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Name" required error={errors.contactName}>
                <input className={errors.contactName ? errorInputCls : inputCls} value={form.contactName || ""} onChange={(e) => set("contactName", e.target.value)} disabled={readOnly} />
              </Field>
              <Field label="Contact Role" required error={errors.contactRole}>
                <input className={errors.contactRole ? errorInputCls : inputCls} value={form.contactRole || ""} onChange={(e) => set("contactRole", e.target.value)} disabled={readOnly} />
              </Field>
              <Field label="Contact Email" required error={errors.contactEmail}>
                <input type="email" className={errors.contactEmail ? errorInputCls : inputCls} value={form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} disabled={readOnly} />
              </Field>
              <Field label="Contact Phone" required error={errors.contactPhone}>
                <input className={errors.contactPhone ? errorInputCls : inputCls} value={form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} disabled={readOnly} />
              </Field>
              <Field label="Contact LinkedIn" required error={errors.contactLinkedIn}>
                <input className={errors.contactLinkedIn ? errorInputCls : inputCls} value={form.contactLinkedIn || ""} onChange={(e) => set("contactLinkedIn", e.target.value)} disabled={readOnly} />
              </Field>
            </div>
          </div>

          {/* Won/Lost reason */}
          {(form.status === "closed_won" || form.status === "closed_lost") && (
            <Field label="Won / Lost Reason" required error={errors.wonLostReason}>
              <textarea
                className={errors.wonLostReason ? errorInputCls : inputCls}
                rows={2}
                value={form.wonLostReason || ""}
                onChange={(e) => set("wonLostReason", e.target.value)}
                disabled={readOnly}
              />
            </Field>
          )}

          {!readOnly && (
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
              >
                {loading ? "Saving…" : existing?.id ? "Save Changes" : "Create Requirement"}
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
          )}
        </div>

        {/* Right: Job Description */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl p-4 h-full flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-sm font-semibold text-white/70 mb-3">Job Description</h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="jdReceived"
                checked={Boolean(form.jdReceived)}
                onChange={(e) => set("jdReceived", e.target.checked)}
                disabled={readOnly}
                className="rounded"
              />
              <label htmlFor="jdReceived" className="text-sm text-white/70">
                JD Received
              </label>
            </div>
            <Field label="JD Link (URL)">
              <input
                type="url"
                className={inputCls}
                value={form.jdLink || ""}
                onChange={(e) => set("jdLink", e.target.value)}
                placeholder="https://…"
                disabled={readOnly}
              />
            </Field>
            <div className="mt-4 flex-1 flex flex-col">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
                JD Text (paste the job description)
              </label>
              <textarea
                className={`${inputCls} flex-1 resize-none`}
                rows={14}
                value={form.jdText || ""}
                onChange={(e) => set("jdText", e.target.value)}
                placeholder="Paste the job description here — it'll be scanned for required/preferred skills so candidates can be matched automatically."
                maxLength={20000}
                disabled={readOnly}
              />
              <p className="text-xs text-white/30 mt-1">
                {(form.jdText || "").length.toLocaleString()} / 20,000 characters
              </p>
            </div>
          </div>
        </div>
      </form>

      {accountDuplicates && accountDuplicates.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" style={{ background: "rgba(15,15,40,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 className="text-base font-semibold text-white">Possible existing account</h2>
            <p className="text-sm text-white/50">
              An account matching &ldquo;{form.clientGroup}&rdquo; may already exist. Link this requirement to it, or create a new account anyway.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {accountDuplicates.map((d) => (
                <div key={d.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <p className="text-sm font-medium text-white/85">{d.name}</p>
                    <p className="text-xs text-white/40">{d.accountId} {d.domain ? `· ${d.domain}` : ""} · matched on {d.reasons.join(", ")}</p>
                  </div>
                  <button
                    onClick={() => submitForm({ action: "use_existing", accountId: d.id })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    Use this
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setAccountDuplicates(null)} className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => submitForm({ action: "create_new" })}
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

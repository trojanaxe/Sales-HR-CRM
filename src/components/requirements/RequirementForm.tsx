"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
  meetingStatus?: string;
  jdReceived?: boolean;
  jdLink?: string;
  wonLostReason?: string;
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

  const [form, setForm] = useState<RequirementData>({
    clientGroup: "",
    jobRole: "",
    priority: "medium",
    status: "open",
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
  }

  const filteredGroups = clientGroups.filter(
    (g) =>
      form.clientGroup &&
      g.toLowerCase().includes(form.clientGroup.toLowerCase()) &&
      g !== form.clientGroup
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = existing?.id
        ? `/api/requirements/${existing.id}`
        : "/api/requirements";
      const method = existing?.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success(existing?.id ? "Requirement updated" : "Requirement created");
      router.push(`/requirements/${data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {existing?.id
            ? `Edit ${existing.reqId}`
            : "New Requirement"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Group with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Group <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={form.clientGroup || ""}
              onChange={(e) => {
                set("clientGroup", e.target.value);
                setShowClientSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
              disabled={readOnly}
              required
            />
            {showClientSuggestions && filteredGroups.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-auto">
                {filteredGroups.map((g) => (
                  <li
                    key={g}
                    className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
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

          <Field label="Job Role *">
            <input
              className={inputCls}
              value={form.jobRole || ""}
              onChange={(e) => set("jobRole", e.target.value)}
              required
              disabled={readOnly}
            />
          </Field>

          <Field label="Priority">
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

          <Field label="Status">
            <select
              className={inputCls}
              value={form.status || "open"}
              onChange={(e) => set("status", e.target.value)}
              disabled={readOnly}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </Field>

          <Field label="Vendor / Company">
            <input
              className={inputCls}
              value={form.vendor || ""}
              onChange={(e) => set("vendor", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Location">
            <input
              className={inputCls}
              value={form.location || ""}
              onChange={(e) => set("location", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Experience (e.g. 5-8 years)">
            <input
              className={inputCls}
              value={form.experience || ""}
              onChange={(e) => set("experience", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Budget / Rate">
            <input
              className={inputCls}
              value={form.budget || ""}
              onChange={(e) => set("budget", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Contract Mode">
            <select
              className={inputCls}
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

          <Field label="Industry">
            <input
              className={inputCls}
              value={form.industry || ""}
              onChange={(e) => set("industry", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Closing Date">
            <input
              type="date"
              className={inputCls}
              value={form.closingDate ? form.closingDate.split("T")[0] : ""}
              onChange={(e) => set("closingDate", e.target.value)}
              disabled={readOnly}
            />
          </Field>

          <Field label="Meeting Status">
            <input
              className={inputCls}
              value={form.meetingStatus || ""}
              onChange={(e) => set("meetingStatus", e.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>

        {/* Contact section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Contact Name">
              <input className={inputCls} value={form.contactName || ""} onChange={(e) => set("contactName", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Contact Role">
              <input className={inputCls} value={form.contactRole || ""} onChange={(e) => set("contactRole", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Contact Email">
              <input type="email" className={inputCls} value={form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Contact Phone">
              <input className={inputCls} value={form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Contact LinkedIn">
              <input className={inputCls} value={form.contactLinkedIn || ""} onChange={(e) => set("contactLinkedIn", e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </div>

        {/* JD section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Job Description</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="jdReceived"
                checked={Boolean(form.jdReceived)}
                onChange={(e) => set("jdReceived", e.target.checked)}
                disabled={readOnly}
                className="rounded"
              />
              <label htmlFor="jdReceived" className="text-sm text-gray-700">
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
          </div>
        </div>

        {/* Won/Lost reason */}
        {(form.status === "closed_won" || form.status === "closed_lost") && (
          <Field label="Won / Lost Reason">
            <textarea
              className={inputCls}
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
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Saving…" : existing?.id ? "Save Changes" : "Create Requirement"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

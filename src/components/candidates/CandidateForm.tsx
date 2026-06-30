"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface CandidateData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  currentLocation?: string;
  willingToRelocate?: boolean;
  skills?: string[];
  experience?: string;
  visaStatus?: string;
  source?: string;
}

export default function CandidateForm({ existing }: { existing?: CandidateData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState<CandidateData>({
    name: "",
    email: "",
    phone: "",
    linkedIn: "",
    currentLocation: "",
    willingToRelocate: false,
    skills: [],
    experience: "",
    visaStatus: "",
    source: "external",
    ...existing,
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills?.includes(s)) {
      set("skills", [...(form.skills || []), s]);
    }
    setSkillInput("");
  }

  function removeSkill(s: string) {
    set("skills", form.skills?.filter((x) => x !== s) || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = existing?.id ? `/api/candidates/${existing.id}` : "/api/candidates";
      const method = existing?.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(existing?.id ? "Updated" : "Candidate created");
      router.push(`/candidates/${data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{existing?.id ? "Edit Candidate" : "New Candidate"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name *">
            <input className={inputCls} value={form.name || ""} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="LinkedIn">
            <input className={inputCls} value={form.linkedIn || ""} onChange={(e) => set("linkedIn", e.target.value)} />
          </Field>
          <Field label="Current Location">
            <input className={inputCls} value={form.currentLocation || ""} onChange={(e) => set("currentLocation", e.target.value)} />
          </Field>
          <Field label="Experience (years)">
            <input type="number" step="0.5" className={inputCls} value={form.experience || ""} onChange={(e) => set("experience", e.target.value)} />
          </Field>
          <Field label="Visa / Work Authorization">
            <input className={inputCls} value={form.visaStatus || ""} onChange={(e) => set("visaStatus", e.target.value)} placeholder="e.g. H1B, GC, Citizen" />
          </Field>
          <Field label="Source">
            <select className={inputCls} value={form.source || "external"} onChange={(e) => set("source", e.target.value)}>
              <option value="bench">Bench</option>
              <option value="external">External</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="reloc" checked={Boolean(form.willingToRelocate)} onChange={(e) => set("willingToRelocate", e.target.checked)} className="rounded" />
          <label htmlFor="reloc" className="text-sm text-gray-700">Willing to relocate</label>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
          <div className="flex gap-2 mb-2">
            <input
              placeholder="Add skill (press Enter)…"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button type="button" onClick={addSkill} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.skills?.map((s) => (
              <span key={s} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
                {s}
                <button type="button" onClick={() => removeSkill(s)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg">
            {loading ? "Saving…" : existing?.id ? "Save Changes" : "Create Candidate"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

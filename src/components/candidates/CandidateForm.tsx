"use client";
import React, { useState } from "react";
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
  certifications?: string[];
  experience?: string;
  visaStatus?: string;
  source?: string;
  sourceDetail?: string;
  currentJobTitle?: string;
  noticePeriod?: string;
  currentCTC?: string;
  expectedCTC?: string;
}

const inputCls = "glass-input w-full px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function CandidateForm({ existing }: { existing?: CandidateData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [form, setForm] = useState<CandidateData>({
    name: "",
    email: "",
    phone: "",
    linkedIn: "",
    currentLocation: "",
    willingToRelocate: false,
    skills: [],
    certifications: [],
    experience: "",
    visaStatus: "",
    source: "external",
    sourceDetail: "",
    currentJobTitle: "",
    noticePeriod: "",
    currentCTC: "",
    expectedCTC: "",
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

  function addCert() {
    const c = certInput.trim();
    if (c && !form.certifications?.includes(c)) {
      set("certifications", [...(form.certifications || []), c]);
    }
    setCertInput("");
  }

  function removeCert(c: string) {
    set("certifications", form.certifications?.filter((x) => x !== c) || []);
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

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-white/50 hover:text-white/90 transition-colors cursor-pointer">← Back</button>
        <h1 className="text-2xl font-bold text-white tracking-tight">{existing?.id ? "Edit Candidate" : "New Candidate"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)" }}>
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
          <Field label="Source Detail">
            <input className={inputCls} value={form.sourceDetail || ""} onChange={(e) => set("sourceDetail", e.target.value)} placeholder="e.g. LinkedIn, Naukri, vendor name" />
          </Field>
          <Field label="Current Job Title">
            <input className={inputCls} value={form.currentJobTitle || ""} onChange={(e) => set("currentJobTitle", e.target.value)} />
          </Field>
          <Field label="Notice Period">
            <input className={inputCls} value={form.noticePeriod || ""} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. 30 days, Immediate" />
          </Field>
          <Field label="Current CTC">
            <input className={inputCls} value={form.currentCTC || ""} onChange={(e) => set("currentCTC", e.target.value)} />
          </Field>
          <Field label="Expected CTC">
            <input className={inputCls} value={form.expectedCTC || ""} onChange={(e) => set("expectedCTC", e.target.value)} />
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
            <button type="button" onClick={addSkill} className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>Add</button>
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

        {/* Certifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
          <div className="flex gap-2 mb-2">
            <input
              placeholder="Add certification (press Enter)…"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCert(); } }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button type="button" onClick={addCert} className="px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 cursor-pointer" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.certifications?.map((c) => (
              <span key={c} className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs flex items-center gap-1">
                {c}
                <button type="button" onClick={() => removeCert(c)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50" style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>
            {loading ? "Saving…" : existing?.id ? "Save Changes" : "Create Candidate"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 text-sm font-medium text-white/60 hover:text-white rounded-xl transition-all duration-200 cursor-pointer" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

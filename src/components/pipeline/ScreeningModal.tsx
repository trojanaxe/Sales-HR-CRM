"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SCREENING_SECTIONS } from "@/lib/screening-questions";

type Responses = Record<string, Record<string, string>>;

interface ScreeningRecord {
  id: string;
  conductedAt: string;
  conductedBy: { name: string };
  responses: Responses;
  notes: string | null;
}

const glass = {
  background: "rgba(15,15,40,0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

export default function ScreeningModal({
  pipelineEntry,
  onClose,
}: {
  pipelineEntry: { id: string; candidate: { name: string }; requirement: { reqId: string; clientGroup: string } };
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [history, setHistory] = useState<ScreeningRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(SCREENING_SECTIONS[0].id);

  const [responses, setResponses] = useState<Responses>(() =>
    Object.fromEntries(
      SCREENING_SECTIONS.map((s) => [
        s.id,
        Object.fromEntries(s.questions.map((q) => [q.id, ""])),
      ])
    )
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/pipeline/${pipelineEntry.id}/screening`)
      .then((r) => r.json())
      .then((d) => { setHistory(d); setLoadingHistory(false); });
  }, [pipelineEntry.id]);

  function setAnswer(sectionId: string, questionId: string, value: string) {
    setResponses((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [questionId]: value },
    }));
  }

  async function saveScreening() {
    setSaving(true);
    try {
      const res = await fetch(`/api/pipeline/${pipelineEntry.id}/screening`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, notes: notes || null }),
      });
      if (res.ok) {
        toast.success("Screening saved");
        const saved = await res.json();
        setHistory((prev) => [saved, ...prev]);
        setTab("history");
        setResponses(
          Object.fromEntries(
            SCREENING_SECTIONS.map((s) => [
              s.id,
              Object.fromEntries(s.questions.map((q) => [q.id, ""])),
            ])
          )
        );
        setNotes("");
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const completedSections = SCREENING_SECTIONS.filter((s) =>
    s.questions.some((q) => responses[s.id]?.[q.id]?.trim())
  ).length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" style={{ ...glass, boxShadow: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h2 className="text-base font-semibold text-white">HR Screening</h2>
            <p className="text-sm text-white/40 mt-0.5">
              {pipelineEntry.candidate.name} · {pipelineEntry.requirement.reqId} ({pipelineEntry.requirement.clientGroup})
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none mt-1 transition-colors cursor-pointer">×</button>
        </div>

        {/* Tabs */}
        <div className="flex px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {(["new", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 text-sm font-medium border-b-2 mr-4 transition-colors cursor-pointer ${
                tab === t
                  ? "border-indigo-400 text-indigo-300"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {t === "new" ? "New Screening" : `History (${history.length})`}
            </button>
          ))}
        </div>

        {tab === "new" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Section nav */}
            <div className="w-44 overflow-y-auto py-2 shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
              {SCREENING_SECTIONS.map((section) => {
                const hasAnswers = section.questions.some((q) => responses[section.id]?.[q.id]?.trim());
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                      activeSection === section.id
                        ? "text-indigo-300 font-medium"
                        : "text-white/40 hover:text-white/70"
                    }`}
                    style={activeSection === section.id ? { background: "rgba(99,102,241,0.15)" } : {}}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full inline-block mr-2 ${hasAnswers ? "bg-emerald-400" : "bg-white/20"}`} />
                    {section.title}
                  </button>
                );
              })}
              <div className="px-3 py-2 text-xs text-white/25 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {completedSections}/{SCREENING_SECTIONS.length} sections
              </div>
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto p-5">
              {SCREENING_SECTIONS.filter((s) => s.id === activeSection).map((section) => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-white/80 mb-4">{section.title}</h3>
                  <div className="space-y-5">
                    {section.questions.map((q) => (
                      <div key={q.id}>
                        <label className="block text-xs font-medium text-white/50 mb-1.5 leading-snug uppercase tracking-wide">
                          {q.question}
                        </label>
                        <textarea
                          rows={2}
                          value={responses[section.id]?.[q.id] || ""}
                          onChange={(e) => setAnswer(section.id, q.id, e.target.value)}
                          placeholder="Enter response…"
                          className="glass-input w-full px-3 py-2 text-sm resize-y"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {activeSection === SCREENING_SECTIONS[SCREENING_SECTIONS.length - 1].id && (
                <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-1.5">
                    Additional Notes / Observations
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional observations or comments…"
                    className="glass-input w-full px-3 py-2 text-sm resize-y"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {loadingHistory ? (
              <p className="text-sm text-white/30 text-center py-8">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No screening records yet.</p>
            ) : (
              <div className="space-y-6">
                {history.map((record) => (
                  <div key={record.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-white/80">
                        Screened by {record.conductedBy.name}
                      </p>
                      <p className="text-xs text-white/30">
                        {new Date(record.conductedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {SCREENING_SECTIONS.map((section) => {
                        const sectionResponses = record.responses?.[section.id];
                        const hasAny = sectionResponses && Object.values(sectionResponses).some((v) => v?.trim());
                        if (!hasAny) return null;
                        return (
                          <div key={section.id}>
                            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                              {section.title}
                            </h4>
                            <div className="space-y-2">
                              {section.questions.map((q) => {
                                const ans = sectionResponses?.[q.id];
                                if (!ans?.trim()) return null;
                                return (
                                  <div key={q.id} className="pl-3 border-l-2 border-indigo-500/30">
                                    <p className="text-xs text-white/35">{q.question}</p>
                                    <p className="text-sm text-white/70 mt-0.5 whitespace-pre-wrap">{ans}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {record.notes && (
                        <div>
                          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                            Additional Notes
                          </h4>
                          <p className="text-sm text-white/70 whitespace-pre-wrap">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {tab === "new" ? (
            <>
              <div className="flex gap-2">
                {SCREENING_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className="w-2 h-2 rounded-full transition-colors cursor-pointer"
                    style={{
                      background: activeSection === s.id
                        ? "#6366f1"
                        : responses[s.id] && Object.values(responses[s.id]).some((v) => v.trim())
                          ? "#10b981"
                          : "rgba(255,255,255,0.2)",
                    }}
                    title={s.title}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-xl text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveScreening}
                  disabled={saving || completedSections === 0}
                  className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  {saving ? "Saving…" : "Save Screening"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-between w-full">
              <button
                onClick={() => setTab("new")}
                className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                + New Screening
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-xl text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

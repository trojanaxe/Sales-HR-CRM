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

  // responses keyed by section id → question id → answer
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
        // Reset form
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">HR Screening</h2>
            <p className="text-sm text-gray-500">
              {pipelineEntry.candidate.name} · {pipelineEntry.requirement.reqId} ({pipelineEntry.requirement.clientGroup})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setTab("new")}
            className={`py-2.5 text-sm font-medium border-b-2 mr-4 transition-colors ${tab === "new" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            New Screening
          </button>
          <button
            onClick={() => setTab("history")}
            className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            History ({history.length})
          </button>
        </div>

        {tab === "new" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Section nav */}
            <div className="w-44 border-r border-gray-100 overflow-y-auto py-2 shrink-0">
              {SCREENING_SECTIONS.map((section) => {
                const hasAnswers = section.questions.some((q) => responses[section.id]?.[q.id]?.trim());
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full inline-block mr-2 ${hasAnswers ? "bg-green-500" : "bg-gray-300"}`} />
                    {section.title}
                  </button>
                );
              })}
              <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 mt-2">
                {completedSections}/{SCREENING_SECTIONS.length} sections
              </div>
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto p-5">
              {SCREENING_SECTIONS.filter((s) => s.id === activeSection).map((section) => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">{section.title}</h3>
                  <div className="space-y-5">
                    {section.questions.map((q) => (
                      <div key={q.id}>
                        <label className="block text-sm text-gray-700 mb-1.5 leading-snug">
                          {q.question}
                        </label>
                        <textarea
                          rows={2}
                          value={responses[section.id]?.[q.id] || ""}
                          onChange={(e) => setAnswer(section.id, q.id, e.target.value)}
                          placeholder="Enter response…"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* General notes */}
              {activeSection === SCREENING_SECTIONS[SCREENING_SECTIONS.length - 1].id && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Additional Notes / Observations
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional observations or comments…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {loadingHistory ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400">No screening records yet.</p>
            ) : (
              <div className="space-y-6">
                {history.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-800">
                        Screened by {record.conductedBy.name}
                      </p>
                      <p className="text-xs text-gray-400">
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
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                              {section.title}
                            </h4>
                            <div className="space-y-2">
                              {section.questions.map((q) => {
                                const ans = sectionResponses?.[q.id];
                                if (!ans?.trim()) return null;
                                return (
                                  <div key={q.id} className="pl-3 border-l-2 border-gray-200">
                                    <p className="text-xs text-gray-500">{q.question}</p>
                                    <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{ans}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {record.notes && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Additional Notes
                          </h4>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{record.notes}</p>
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
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          {tab === "new" ? (
            <>
              <div className="flex gap-2">
                {SCREENING_SECTIONS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      activeSection === s.id
                        ? "bg-blue-600"
                        : responses[s.id] && Object.values(responses[s.id]).some((v) => v.trim())
                          ? "bg-green-400"
                          : "bg-gray-300"
                    }`}
                    title={s.title}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={saveScreening}
                  disabled={saving || completedSections === 0}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving ? "Saving…" : "Save Screening"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-between w-full">
              <button
                onClick={() => setTab("new")}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                + New Screening
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

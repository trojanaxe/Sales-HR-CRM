"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

export default function NotesThread({
  entityType,
  entityId,
  notes,
  onNoteAdded,
}: {
  entityType: "requirement" | "candidate" | "pipeline";
  entityId: string;
  notes: Note[];
  onNoteAdded: () => void;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const endpoint =
    entityType === "requirement"
      ? `/api/requirements/${entityId}/notes`
      : entityType === "candidate"
      ? `/api/candidates/${entityId}/notes`
      : `/api/pipeline/${entityId}/notes`;

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        onNoteAdded();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to add note");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Notes</h3>

      <form onSubmit={addNote} className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          className="glass-input w-full px-3 py-2 text-sm resize-none"
        />
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="self-end px-4 py-1.5 text-white text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          {saving ? "Adding…" : "Add Note"}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-sm text-white/30">No notes yet.</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="border-l-2 border-indigo-500/40 pl-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white/70">{note.author.name}</span>
              <span className="text-xs text-white/30">{new Date(note.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-white/60 whitespace-pre-wrap">{note.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

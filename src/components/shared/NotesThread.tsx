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
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-700">Notes</h3>

      <form onSubmit={addNote} className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="self-end px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {saving ? "Adding…" : "Add Note"}
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-sm text-gray-400">No notes yet.</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="border-l-2 border-gray-200 pl-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-700">{note.author.name}</span>
              <span className="text-xs text-gray-400">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

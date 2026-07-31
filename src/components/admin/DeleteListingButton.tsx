"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteListingButton({ id, propertyId }: { id: string; propertyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete listing ${propertyId}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      alert("Failed to delete listing.");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}

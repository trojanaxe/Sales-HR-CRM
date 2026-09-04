"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tier = {
  id: string;
  price: number;
  label: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
};

type TierDraft = {
  price: string;
  label: string;
  description: string;
  sortOrder: string;
};

async function request(url: string, options: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function toDraft(tier: Tier): TierDraft {
  return {
    price: String(tier.price),
    label: tier.label,
    description: tier.description,
    sortOrder: String(tier.sortOrder),
  };
}

const EMPTY_DRAFT: TierDraft = { price: "", label: "", description: "", sortOrder: "0" };

export function PricingManager({ tiers }: { tiers: Tier[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, TierDraft>>(
    Object.fromEntries(tiers.map((t) => [t.id, toDraft(t)])),
  );
  const [newDraft, setNewDraft] = useState<TierDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, field: keyof TierDraft, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function saveTier(id: string) {
    const draft = drafts[id];
    withBusy(`save-${id}`, () =>
      request(`/api/admin/pricing/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          price: Number(draft.price),
          label: draft.label,
          description: draft.description,
          sortOrder: Number(draft.sortOrder),
        }),
      }),
    );
  }

  function toggleTier(id: string, enabled: boolean) {
    withBusy(`toggle-${id}`, () =>
      request(`/api/admin/pricing/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }),
    );
  }

  function deleteTier(id: string, label: string) {
    if (!window.confirm(`Delete pricing tier "${label}"? This cannot be undone.`)) return;
    withBusy(`delete-${id}`, () => request(`/api/admin/pricing/${id}`, { method: "DELETE" }));
  }

  function addTier() {
    withBusy("add", async () => {
      await request("/api/admin/pricing", {
        method: "POST",
        body: JSON.stringify({
          price: Number(newDraft.price),
          label: newDraft.label,
          description: newDraft.description,
          sortOrder: Number(newDraft.sortOrder),
        }),
      });
      setNewDraft(EMPTY_DRAFT);
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {tiers.map((tier) => {
        const draft = drafts[tier.id];
        return (
          <div key={tier.id} className="rounded-xl border border-brand-divider bg-white p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Price (₹)</span>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => updateDraft(tier.id, "price", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-divider px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Label</span>
                <input
                  value={draft.label}
                  onChange={(e) => updateDraft(tier.id, "label", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-divider px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600">Description</span>
                <input
                  value={draft.description}
                  onChange={(e) => updateDraft(tier.id, "description", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-divider px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                Sort order
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => updateDraft(tier.id, "sortOrder", e.target.value)}
                  className="w-16 rounded-lg border border-brand-divider px-2 py-1 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTier(tier.id, !tier.enabled)}
                  disabled={busy === `toggle-${tier.id}`}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                    tier.enabled
                      ? "bg-brand-primary/10 text-brand-primary-dark hover:bg-brand-primary/20"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {tier.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => saveTier(tier.id)}
                  disabled={busy === `save-${tier.id}`}
                  className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary-dark disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => deleteTier(tier.id, tier.label)}
                  disabled={busy === `delete-${tier.id}`}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-dashed border-brand-divider bg-white p-4">
        <h3 className="font-heading text-sm font-semibold text-gray-900">Add a new tier</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Price (₹)</span>
            <input
              type="number"
              value={newDraft.price}
              onChange={(e) => setNewDraft((p) => ({ ...p, price: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-divider px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Label</span>
            <input
              value={newDraft.label}
              onChange={(e) => setNewDraft((p) => ({ ...p, label: e.target.value }))}
              placeholder="1 owner call"
              className="mt-1 w-full rounded-lg border border-brand-divider px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-600">Description</span>
            <input
              value={newDraft.description}
              onChange={(e) => setNewDraft((p) => ({ ...p, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-brand-divider px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Sort order
            <input
              type="number"
              value={newDraft.sortOrder}
              onChange={(e) => setNewDraft((p) => ({ ...p, sortOrder: e.target.value }))}
              className="w-16 rounded-lg border border-brand-divider px-2 py-1 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </label>
          <button
            type="button"
            onClick={addTier}
            disabled={busy === "add" || !newDraft.price || !newDraft.label || !newDraft.description}
            className="ml-auto rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-dark disabled:opacity-60"
          >
            Add Tier
          </button>
        </div>
      </div>
    </div>
  );
}

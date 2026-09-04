"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CityWithAreas } from "@/lib/areas";

async function request(url: string, options: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function ToggleButton({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`text-caption font-whisper rounded-full px-3 py-1 transition disabled:opacity-60 ${
        enabled
          ? "bg-brand-primary/10 text-brand-primary-dark hover:bg-brand-primary/20"
          : "bg-ink-muted/15 text-ink-muted hover:bg-ink-muted/25"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </button>
  );
}

export function AreasManager({ cities }: { cities: CityWithAreas[] }) {
  const router = useRouter();
  const [newCityName, setNewCityName] = useState("");
  const [newAreaName, setNewAreaName] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function addCity() {
    const name = newCityName.trim();
    if (!name) return;
    withBusy("add-city", async () => {
      await request("/api/admin/cities", { method: "POST", body: JSON.stringify({ name }) });
      setNewCityName("");
    });
  }

  function toggleCity(id: string, enabled: boolean) {
    withBusy(`city-toggle-${id}`, () =>
      request(`/api/admin/cities/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }),
    );
  }

  function renameCity(id: string, currentName: string) {
    const name = window.prompt("Rename city", currentName);
    if (!name || name.trim() === "" || name.trim() === currentName) return;
    withBusy(`city-rename-${id}`, () =>
      request(`/api/admin/cities/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim() }),
      }),
    );
  }

  function deleteCity(id: string, name: string) {
    if (!window.confirm(`Delete city "${name}" and all its areas? This cannot be undone.`)) return;
    withBusy(`city-delete-${id}`, () =>
      request(`/api/admin/cities/${id}`, { method: "DELETE" }),
    );
  }

  function addArea(cityId: string) {
    const name = (newAreaName[cityId] || "").trim();
    if (!name) return;
    withBusy(`add-area-${cityId}`, async () => {
      await request("/api/admin/areas", {
        method: "POST",
        body: JSON.stringify({ name, cityId }),
      });
      setNewAreaName((prev) => ({ ...prev, [cityId]: "" }));
    });
  }

  function toggleArea(id: string, enabled: boolean) {
    withBusy(`area-toggle-${id}`, () =>
      request(`/api/admin/areas/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }),
    );
  }

  function renameArea(id: string, currentName: string) {
    const name = window.prompt("Rename area", currentName);
    if (!name || name.trim() === "" || name.trim() === currentName) return;
    withBusy(`area-rename-${id}`, () =>
      request(`/api/admin/areas/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim() }),
      }),
    );
  }

  function deleteArea(id: string, name: string) {
    if (!window.confirm(`Delete area "${name}"? This cannot be undone.`)) return;
    withBusy(`area-delete-${id}`, () =>
      request(`/api/admin/areas/${id}`, { method: "DELETE" }),
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-body-sm text-red-600">{error}</p>}

      <div className="flex gap-2 rounded-3xl border border-brand-divider bg-surface p-5">
        <input
          value={newCityName}
          onChange={(e) => setNewCityName(e.target.value)}
          placeholder="New city name (e.g. Mumbai)"
          className="flex-1 rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <button
          type="button"
          onClick={addCity}
          disabled={busy === "add-city" || !newCityName.trim()}
          className="font-whisper rounded-full bg-brand-primary px-5 py-2.5 text-body-sm text-white shadow-cta transition hover:bg-brand-primary-dark disabled:opacity-60"
        >
          Add City
        </button>
      </div>

      {cities.length === 0 && (
        <p className="rounded-3xl border border-dashed border-brand-divider bg-surface p-8 text-center text-body-sm text-ink-muted">
          No cities yet. Add one above to get started.
        </p>
      )}

      {cities.map((city) => (
        <div key={city.id} className="rounded-3xl border border-brand-divider bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => renameCity(city.id, city.name)}
                className="font-whisper text-body text-ink hover:underline"
              >
                {city.name}
              </button>
              <ToggleButton
                enabled={city.enabled}
                onToggle={() => toggleCity(city.id, !city.enabled)}
                disabled={busy === `city-toggle-${city.id}`}
              />
            </div>
            <button
              type="button"
              onClick={() => deleteCity(city.id, city.name)}
              disabled={busy === `city-delete-${city.id}`}
              className="text-caption font-whisper rounded-full border border-red-200 px-3.5 py-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              Delete City
            </button>
          </div>

          <div className="mt-4 space-y-2 border-t border-brand-divider pt-4">
            {city.areas.length === 0 && (
              <p className="text-body-sm text-ink-muted/70">No areas in this city yet.</p>
            )}
            {city.areas.map((area) => (
              <div
                key={area.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-brand-bg px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => renameArea(area.id, area.name)}
                    className="text-body-sm font-whisper text-ink hover:underline"
                  >
                    {area.name}
                  </button>
                  <ToggleButton
                    enabled={area.enabled}
                    onToggle={() => toggleArea(area.id, !area.enabled)}
                    disabled={busy === `area-toggle-${area.id}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteArea(area.id, area.name)}
                  disabled={busy === `area-delete-${area.id}`}
                  className="text-caption font-whisper rounded-full border border-red-200 px-3 py-1 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <input
                value={newAreaName[city.id] || ""}
                onChange={(e) =>
                  setNewAreaName((prev) => ({ ...prev, [city.id]: e.target.value }))
                }
                placeholder="New area name"
                className="flex-1 rounded-full border border-brand-divider px-4 py-2 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={() => addArea(city.id)}
                disabled={busy === `add-area-${city.id}` || !(newAreaName[city.id] || "").trim()}
                className="font-whisper rounded-full bg-brand-primary/10 px-4 py-2 text-body-sm text-brand-primary-dark transition hover:bg-brand-primary/20 disabled:opacity-60"
              >
                Add Area
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

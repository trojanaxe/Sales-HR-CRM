"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ListingWithImages } from "@/lib/types";
import type { CityWithAreas } from "@/lib/areas";

type FormState = {
  propertyId: string;
  title: string;
  areaId: string;
  rent: string;
  deposit: string;
  availability: "AVAILABLE" | "UNDER_DISCUSSION" | "RENTED";
  propertyType: string;
  bhk: string;
  floor: string;
  totalFloors: string;
  facing: string;
  balcony: string;
  furnishing: string;
  parking: string;
  ageOfBuilding: string;
  maintenance: string;
  waterSupply: string;
  powerBackup: string;
  lift: string;
  gatedCommunity: string;
  preferredTenant: string;
  previousTenant: string;
  petFriendly: string;
  about: string;
  listerType: "OWNER" | "BROKER";
  verified: boolean;
  mapEmbedUrl: string;
  latitude: string;
  longitude: string;
};

const EMPTY_STATE: FormState = {
  propertyId: "",
  title: "",
  areaId: "",
  rent: "",
  deposit: "",
  availability: "AVAILABLE",
  propertyType: "",
  bhk: "",
  floor: "",
  totalFloors: "",
  facing: "",
  balcony: "",
  furnishing: "",
  parking: "",
  ageOfBuilding: "",
  maintenance: "",
  waterSupply: "",
  powerBackup: "",
  lift: "",
  gatedCommunity: "",
  preferredTenant: "",
  previousTenant: "",
  petFriendly: "",
  about: "",
  listerType: "OWNER",
  verified: true,
  mapEmbedUrl: "",
  latitude: "",
  longitude: "",
};

function fromListing(listing: ListingWithImages): FormState {
  return {
    propertyId: listing.propertyId,
    title: listing.title,
    areaId: listing.areaId,
    rent: String(listing.rent),
    deposit: String(listing.deposit),
    availability: listing.availability as FormState["availability"],
    propertyType: listing.propertyType,
    bhk: listing.bhk,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    facing: listing.facing,
    balcony: listing.balcony,
    furnishing: listing.furnishing,
    parking: listing.parking,
    ageOfBuilding: listing.ageOfBuilding,
    maintenance: listing.maintenance,
    waterSupply: listing.waterSupply,
    powerBackup: listing.powerBackup,
    lift: listing.lift,
    gatedCommunity: listing.gatedCommunity,
    preferredTenant: listing.preferredTenant,
    previousTenant: listing.previousTenant,
    petFriendly: listing.petFriendly,
    about: listing.about,
    listerType: listing.listerType as FormState["listerType"],
    verified: listing.verified,
    mapEmbedUrl: listing.mapEmbedUrl || "",
    latitude: listing.latitude !== null ? String(listing.latitude) : "",
    longitude: listing.longitude !== null ? String(listing.longitude) : "",
  };
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (name: keyof FormState, value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-caption font-whisper text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
    </label>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-brand-divider bg-surface p-6">
      <h2 className="font-whisper text-body text-ink">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ListingForm({
  listing,
  cities,
}: {
  listing?: ListingWithImages;
  cities: CityWithAreas[];
}) {
  const router = useRouter();
  const isEdit = Boolean(listing);
  const [form, setForm] = useState<FormState>(listing ? fromListing(listing) : EMPTY_STATE);
  const [images, setImages] = useState<string[]>(listing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(name: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Upload failed.");
          continue;
        }
        setImages((prev) => [...prev, data.url]);
      } catch {
        setError("Upload failed. Please try again.");
      }
    }

    setUploading(false);
    e.target.value = "";
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      rent: Number(form.rent),
      deposit: Number(form.deposit),
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      mapEmbedUrl: form.mapEmbedUrl || null,
      images,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/listings/${listing!.id}` : "/api/admin/listings",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save listing.");
        setSaving(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24">
      <FormSection title="Identity">
        <TextField label="Property ID" name="propertyId" value={form.propertyId} onChange={update} placeholder="BPC-Thanisandra-07" />
        <TextField label="Title" name="title" value={form.title} onChange={update} placeholder="2BHK in Thanisandra" />
        <label className="block">
          <span className="text-caption font-whisper text-ink-muted">Area</span>
          <select
            required
            value={form.areaId}
            onChange={(e) => update("areaId", e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="" disabled>
              Select an area…
            </option>
            {cities.map((city) => (
              <optgroup
                key={city.id}
                label={city.enabled ? city.name : `${city.name} (city disabled)`}
              >
                {city.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.enabled ? area.name : `${area.name} (disabled)`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {cities.every((c) => c.areas.length === 0) && (
            <p className="mt-1.5 text-caption text-red-600">
              No areas exist yet — add one under Admin → Areas &amp; Cities first.
            </p>
          )}
        </label>
        <label className="block">
          <span className="text-caption font-whisper text-ink-muted">Availability</span>
          <select
            value={form.availability}
            onChange={(e) => update("availability", e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="AVAILABLE">Available</option>
            <option value="UNDER_DISCUSSION">Under Discussion</option>
            <option value="RENTED">Rented</option>
          </select>
        </label>
        <label className="block">
          <span className="text-caption font-whisper text-ink-muted">Listed by</span>
          <select
            value={form.listerType}
            onChange={(e) => update("listerType", e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="OWNER">Owner</option>
            <option value="BROKER">Broker</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(e) => setForm((prev) => ({ ...prev, verified: e.target.checked }))}
            className="h-4 w-4 rounded border-brand-divider text-brand-primary focus:ring-brand-primary"
          />
          <span className="text-body-sm text-ink">Verified listing</span>
        </label>
      </FormSection>

      <FormSection title="Price Summary">
        <TextField label="Rent (₹/month)" name="rent" value={form.rent} onChange={update} type="number" />
        <TextField label="Deposit (₹)" name="deposit" value={form.deposit} onChange={update} type="number" />
      </FormSection>

      <FormSection title="Property Overview">
        <TextField label="Property Type" name="propertyType" value={form.propertyType} onChange={update} placeholder="Apartment" />
        <TextField label="BHK" name="bhk" value={form.bhk} onChange={update} placeholder="2 BHK" />
        <TextField label="Floor" name="floor" value={form.floor} onChange={update} placeholder="3rd" />
        <TextField label="Total Floors" name="totalFloors" value={form.totalFloors} onChange={update} placeholder="5" />
        <TextField label="Facing" name="facing" value={form.facing} onChange={update} placeholder="East" />
        <TextField label="Balcony" name="balcony" value={form.balcony} onChange={update} placeholder="2" />
        <TextField label="Furnishing" name="furnishing" value={form.furnishing} onChange={update} placeholder="Semi-furnished" />
        <TextField label="Parking" name="parking" value={form.parking} onChange={update} placeholder="1 Covered (Car)" />
        <TextField label="Age of Building" name="ageOfBuilding" value={form.ageOfBuilding} onChange={update} placeholder="3 years" />
      </FormSection>

      <FormSection title="Utilities & Charges">
        <TextField label="Maintenance" name="maintenance" value={form.maintenance} onChange={update} placeholder="₹1,500/month" />
        <TextField label="Water Supply" name="waterSupply" value={form.waterSupply} onChange={update} placeholder="Cauvery + Borewell" />
        <TextField label="Power Backup" name="powerBackup" value={form.powerBackup} onChange={update} placeholder="Common areas only" />
        <TextField label="Lift" name="lift" value={form.lift} onChange={update} placeholder="Yes" />
        <TextField label="Gated Community" name="gatedCommunity" value={form.gatedCommunity} onChange={update} placeholder="Yes" />
      </FormSection>

      <FormSection title="Tenant Info">
        <TextField label="Preferred Tenant" name="preferredTenant" value={form.preferredTenant} onChange={update} placeholder="Family" />
        <TextField label="Previous Tenant" name="previousTenant" value={form.previousTenant} onChange={update} placeholder="Family, stayed 2 years" />
        <TextField label="Pet Friendly" name="petFriendly" value={form.petFriendly} onChange={update} placeholder="Yes" />
      </FormSection>

      <FormSection title="About the Property">
        <div className="sm:col-span-2">
          <span className="text-caption font-whisper text-ink-muted">About (2–4 human lines, no marketing fluff)</span>
          <textarea
            value={form.about}
            onChange={(e) => update("about", e.target.value)}
            rows={4}
            className="mt-1.5 w-full rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </FormSection>

      <FormSection title="Map">
        <div className="sm:col-span-2">
          <span className="text-caption font-whisper text-ink-muted">
            Map embed URL (Google Maps → Share → Embed a map → copy the src URL)
          </span>
          <input
            type="url"
            value={form.mapEmbedUrl}
            onChange={(e) => update("mapEmbedUrl", e.target.value)}
            placeholder="https://www.google.com/maps?q=...&output=embed"
            className="mt-1.5 w-full rounded-2xl border border-brand-divider px-4 py-2.5 text-body-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <TextField label="Latitude (optional)" name="latitude" value={form.latitude} onChange={update} type="number" />
        <TextField label="Longitude (optional)" name="longitude" value={form.longitude} onChange={update} type="number" />
      </FormSection>

      <FormSection title="Photos (6–10 real photos recommended)">
        <div className="sm:col-span-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="text-body-sm font-whisper block w-full text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-primary/10 file:px-4 file:py-2 file:text-body-sm file:font-whisper file:text-brand-primary-dark hover:file:bg-brand-primary/20"
          />
          {uploading && <p className="mt-2 text-caption text-ink-muted">Uploading…</p>}

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl bg-brand-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-caption font-whisper text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-body-sm text-red-600">{error}</p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-divider bg-surface/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-page gap-3 px-1">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="font-whisper flex-1 rounded-full border border-brand-divider px-4 py-3 text-body-sm text-ink transition hover:bg-brand-bg sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="font-whisper flex-1 rounded-full bg-brand-primary px-4 py-3 text-body-sm text-white shadow-cta transition hover:bg-brand-primary-dark disabled:opacity-60 sm:flex-none"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Listing"}
          </button>
        </div>
      </div>
    </form>
  );
}

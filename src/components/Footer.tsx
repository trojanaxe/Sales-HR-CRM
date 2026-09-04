import Link from "next/link";
import { Logo } from "./Logo";
import { getEnabledCitiesWithAreas } from "@/lib/areas";

export async function Footer() {
  const cities = await getEnabledCitiesWithAreas();
  const coverageLabel = cities
    .map((city) => `${city.name} (${city.areas.map((a) => a.name).join(", ")})`)
    .join(" · ");

  return (
    <footer className="border-t border-brand-divider bg-brand-bg">
      <div className="mx-auto max-w-page px-4 py-12 sm:px-6">
        <Logo />
        <p className="mt-4 max-w-md text-body-sm font-whisper text-ink-muted">
          {coverageLabel
            ? `Verified rental listings across ${coverageLabel}. Premium photos, genuine listings, privacy-first calls.`
            : "Verified rental listings. Premium photos, genuine listings, privacy-first calls."}
        </p>
        <p className="mt-6 text-caption text-ink-muted">
          © {new Date().getFullYear()} Homespy. All rights reserved.
        </p>
        <Link
          href="/admin"
          className="mt-2 inline-block text-caption text-ink-muted/60 hover:text-ink-muted"
        >
          Admin
        </Link>
      </div>
    </footer>
  );
}

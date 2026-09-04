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
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Logo />
        <p className="mt-3 max-w-md text-sm text-gray-600">
          {coverageLabel
            ? `Verified rental listings across ${coverageLabel}. Premium photos, genuine listings, privacy-first calls.`
            : "Verified rental listings. Premium photos, genuine listings, privacy-first calls."}
        </p>
        <p className="mt-4 text-xs text-gray-400">
          © {new Date().getFullYear()} Homespy. All rights reserved.
        </p>
        <Link href="/admin" className="mt-2 inline-block text-xs text-gray-300 hover:text-gray-400">
          Admin
        </Link>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Logo } from "./Logo";
import { SERVICE_AREAS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-brand-divider bg-brand-bg">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Logo />
        <p className="mt-3 max-w-md text-sm text-gray-600">
          Verified rental listings across {SERVICE_AREAS.join(", ")}, Bangalore.
          Premium photos, genuine listings, privacy-first calls.
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

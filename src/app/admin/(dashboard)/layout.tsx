import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/admin/LogoutButton";

const NAV_LINKS = [
  { href: "/admin", label: "Listings" },
  { href: "/admin/areas", label: "Areas & Cities" },
  { href: "/admin/pricing", label: "Pricing" },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 z-10 border-b border-brand-divider bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full bg-brand-bg px-2 py-0.5 text-xs font-medium text-gray-500">
              Admin
            </span>
          </Link>
          <LogoutButton />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-brand-bg hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

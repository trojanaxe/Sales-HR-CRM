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
      <header className="sticky top-0 z-10 border-b border-brand-divider bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="text-caption font-whisper rounded-full bg-brand-bg px-3 py-1 text-ink-muted">
              Admin
            </span>
          </Link>

          <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-brand-divider bg-brand-bg p-1 sm:order-2 sm:w-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-sm font-whisper whitespace-nowrap rounded-full px-4 py-2 text-ink-muted transition hover:bg-surface hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="order-2 sm:order-3">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-page px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

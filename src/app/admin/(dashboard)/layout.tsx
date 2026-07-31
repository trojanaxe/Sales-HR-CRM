import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/admin/LogoutButton";

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
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

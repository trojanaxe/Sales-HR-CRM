import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = {
  title: "Admin Login — Homespy",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm rounded-3xl border border-brand-divider bg-surface p-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="font-whisper mt-5 text-center text-subheading text-ink">Admin Login</h1>
        <p className="mt-1 text-center text-body-sm text-ink-muted">
          Manage listings, photos, and pricing.
        </p>

        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

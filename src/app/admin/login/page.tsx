import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = {
  title: "Admin Login — Homespy",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand-divider bg-white p-6 shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="font-heading mt-4 text-center text-lg font-semibold text-gray-900">Admin Login</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
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

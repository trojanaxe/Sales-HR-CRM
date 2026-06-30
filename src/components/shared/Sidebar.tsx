"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "sales", "hr"] },
  { href: "/requirements", label: "Requirements", roles: ["admin", "sales", "hr"] },
  { href: "/candidates", label: "Candidates", roles: ["admin", "hr"] },
  { href: "/pipeline", label: "Pipeline", roles: ["admin", "hr"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
];

export default function Sidebar({
  user,
}: {
  user: { id: string; name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  const visible = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-gray-100">
        <p className="text-base font-bold text-gray-900">Sietrix CRM</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {visible.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
        <button
          onClick={logout}
          className="mt-3 w-full text-left text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

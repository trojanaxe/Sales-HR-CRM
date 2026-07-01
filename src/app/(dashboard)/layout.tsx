import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/shared/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="blob-1 absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full bg-indigo-600/[0.18] blur-[130px]" />
        <div className="blob-2 absolute top-[45%] right-[-12%] w-[550px] h-[550px] rounded-full bg-violet-600/[0.18] blur-[130px]" />
        <div className="blob-3 absolute bottom-[-20%] left-[35%] w-[450px] h-[450px] rounded-full bg-cyan-600/[0.12] blur-[120px]" />
      </div>

      <Sidebar user={{ id: user.id, name: user.name, email: user.email, role: user.role }} />

      <main className="flex-1 overflow-auto">
        <div className="p-6 min-h-full">{children}</div>
      </main>
    </div>
  );
}

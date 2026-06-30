import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/shared/DashboardClient";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <DashboardClient user={{ id: user.id, name: user.name, role: user.role }} />;
}

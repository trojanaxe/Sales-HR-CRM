import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RequirementsClient from "@/components/requirements/RequirementsClient";

export default async function RequirementsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <RequirementsClient userRole={user.role} userId={user.id} />;
}

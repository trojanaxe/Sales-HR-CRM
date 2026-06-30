import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RequirementForm from "@/components/requirements/RequirementForm";

export default async function NewRequirementPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "hr") redirect("/requirements");
  return <RequirementForm />;
}

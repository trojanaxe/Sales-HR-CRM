import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RequirementDetail from "@/components/requirements/RequirementDetail";

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { id } = await params;
  return (
    <RequirementDetail
      id={id}
      userRole={user.role}
      userId={user.id}
    />
  );
}

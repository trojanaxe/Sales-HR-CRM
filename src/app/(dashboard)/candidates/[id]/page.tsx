import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CandidateDetail from "@/components/candidates/CandidateDetail";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  const { id } = await params;
  return <CandidateDetail id={id} userRole={user.role} userId={user.id} />;
}

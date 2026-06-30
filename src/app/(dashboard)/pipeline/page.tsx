import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PipelineKanban from "@/components/pipeline/PipelineKanban";

export default async function PipelinePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  return <PipelineKanban userRole={user.role} userId={user.id} />;
}

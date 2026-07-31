import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ResumeDatabaseClient from "@/components/resume-database/ResumeDatabaseClient";

export default async function ResumeDatabasePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  return <ResumeDatabaseClient userRole={user.role} />;
}

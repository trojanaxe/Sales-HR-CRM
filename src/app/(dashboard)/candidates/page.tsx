import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CandidatesClient from "@/components/candidates/CandidatesClient";

export default async function CandidatesPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  return <CandidatesClient />;
}

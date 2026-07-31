import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CandidateForm from "@/components/candidates/CandidateForm";

export default async function NewCandidatePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  return <CandidateForm />;
}

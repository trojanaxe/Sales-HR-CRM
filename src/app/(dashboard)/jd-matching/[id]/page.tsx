import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import JDMatchingResults from "@/components/jd-matching/JDMatchingResults";

export default async function JDMatchingResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  const { id } = await params;
  return <JDMatchingResults id={id} />;
}

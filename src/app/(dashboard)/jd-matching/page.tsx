import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import JDMatchingClient from "@/components/jd-matching/JDMatchingClient";

export default async function JDMatchingPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  return <JDMatchingClient />;
}

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountForm from "@/components/accounts/AccountForm";

export default async function NewAccountPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "hr") redirect("/accounts");
  return <AccountForm />;
}

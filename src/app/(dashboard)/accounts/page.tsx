import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountsClient from "@/components/accounts/AccountsClient";

export default async function AccountsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <AccountsClient userRole={user.role} />;
}

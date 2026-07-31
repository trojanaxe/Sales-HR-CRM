import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountDetail from "@/components/accounts/AccountDetail";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { id } = await params;
  return <AccountDetail id={id} userRole={user.role} />;
}

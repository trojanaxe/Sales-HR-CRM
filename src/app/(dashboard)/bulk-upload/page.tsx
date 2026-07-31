import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import BulkUploadClient from "@/components/bulk-upload/BulkUploadClient";

export default async function BulkUploadPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "sales") redirect("/dashboard");
  return <BulkUploadClient userRole={user.role} />;
}

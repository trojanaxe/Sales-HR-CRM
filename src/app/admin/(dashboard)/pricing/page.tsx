import { getAllPricingTiers } from "@/lib/pricing";
import { PricingManager } from "@/components/admin/PricingManager";

export const metadata = { title: "Pricing — Homespy Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const tiers = await getAllPricingTiers();

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900">Pricing</h1>
      <p className="mt-1 text-sm text-gray-500">
        Edits here reflect instantly on the homepage pricing section and the hero&apos;s
        &quot;starts at&quot; line — no redeploy needed. Disabled tiers are hidden from the
        public site but kept here for later.
      </p>
      <div className="mt-6">
        <PricingManager tiers={tiers} />
      </div>
    </div>
  );
}

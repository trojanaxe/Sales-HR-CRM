import { getActivePricingTiers } from "@/lib/pricing";

export async function Pricing() {
  const tiers = await getActivePricingTiers();

  if (tiers.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-heading text-center text-2xl font-bold text-gray-900 sm:text-3xl">Pricing</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-gray-500">
          No hidden fees. Pay only when you want to talk to the owner.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col rounded-full border border-brand-divider bg-white px-6 py-10 text-center shadow-sm"
            >
              <p className="text-3xl font-bold text-brand-primary-dark">
                ₹{tier.price}
              </p>
              <p className="mt-1 font-semibold text-gray-900">{tier.label}</p>
              <p className="mt-2 text-sm text-gray-500">{tier.description}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-xl bg-brand-bg p-4 text-center text-sm text-gray-600">
          <p className="font-medium text-gray-700">Rental availability changes quickly.</p>
          <p className="mt-1">
            If the selected property is rented out, your call credit remains safe for another
            listing.
          </p>
        </div>
      </div>
    </section>
  );
}

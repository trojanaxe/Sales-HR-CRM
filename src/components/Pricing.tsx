import { getActivePricingTiers } from "@/lib/pricing";

export async function Pricing() {
  const tiers = await getActivePricingTiers();

  if (tiers.length === 0) return null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
        <h2 className="font-whisper text-center text-heading text-ink">Pricing</h2>
        <p className="mx-auto mt-3 max-w-md text-center text-body-sm text-ink-muted">
          No hidden fees. Pay only when you want to talk to the owner.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col rounded-3xl border border-brand-divider bg-surface p-8 text-center sm:p-12"
            >
              <p className="font-whisper text-heading text-brand-primary-dark">₹{tier.price}</p>
              <p className="font-whisper mt-2 text-subheading text-ink">{tier.label}</p>
              <p className="mt-3 text-body-sm text-ink-muted">{tier.description}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-brand-bg p-6 text-center text-body-sm text-ink-muted">
          <p className="font-whisper text-ink">Rental availability changes quickly.</p>
          <p className="mt-1">
            If the selected property is rented out, your call credit remains safe for another
            listing.
          </p>
        </div>
      </div>
    </section>
  );
}

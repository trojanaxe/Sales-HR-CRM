import { getActivePricingTiers } from "@/lib/pricing";
import { KeyGlyph } from "./icons";

export async function Hero() {
  const tiers = await getActivePricingTiers();
  const minPrice = tiers.length > 0 ? Math.min(...tiers.map((t) => t.price)) : null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-page px-4 py-16 text-center sm:px-6">
        <h1 className="font-whisper text-heading text-ink sm:text-heading-lg lg:text-display">
          <span className="sr-only">House Hunting,</span>
          <span aria-hidden="true" className="inline-flex items-baseline">
            H
            <KeyGlyph className="mx-[0.03em] inline-block h-[0.62em] w-[0.62em] shrink-0 translate-y-[0.14em] text-brand-primary" />
            use Hunting,
          </span>
          <br className="sm:hidden" /> Done Right.
        </h1>

        <ul className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-2">
          {["Premium photos", "Genuine listings", "Privacy-first calls"].map((item) => (
            <li
              key={item}
              className="rounded-full bg-brand-bg px-4 py-2 text-body-sm font-whisper text-ink-muted"
            >
              {item}
            </li>
          ))}
        </ul>

        {minPrice !== null && (
          <p className="mx-auto mt-6 inline-block rounded-full bg-brand-primary/10 px-4 py-1.5 text-body-sm font-whisper text-brand-primary-dark">
            Pricing starts at ₹{minPrice} only
          </p>
        )}

        <div className="mt-8">
          <a
            href="#listings"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-brand-primary px-8 py-4 text-body font-whisper text-white shadow-cta transition hover:bg-brand-primary-dark active:scale-[0.99] sm:w-auto"
          >
            View Available Flats
          </a>
        </div>
      </div>
    </section>
  );
}

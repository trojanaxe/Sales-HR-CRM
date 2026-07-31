export function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          House Hunting,
          <br className="sm:hidden" /> Done Right.
        </h1>

        <ul className="mx-auto mt-5 flex max-w-md flex-col items-center gap-1.5 text-base text-gray-600 sm:text-lg">
          <li>Premium photos</li>
          <li>Genuine listings</li>
          <li>Privacy-first calls</li>
        </ul>

        <p className="mx-auto mt-5 inline-block rounded-full bg-brand-primary/10 px-4 py-1.5 text-sm font-semibold text-brand-primary-dark sm:text-base">
          Pricing starts at ₹199 only
        </p>

        <div className="mt-7">
          <a
            href="#listings"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-[0.99] sm:w-auto"
          >
            View Available Flats
          </a>
        </div>
      </div>
    </section>
  );
}

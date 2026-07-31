const STEPS = [
  {
    number: "1",
    title: "Browse verified rental listings",
    description: "Explore real photos and honest details — no fake listings, no spam.",
  },
  {
    number: "2",
    title: "Pick a property you like",
    description: "Check the full details, photos, and location before deciding.",
  },
  {
    number: "3",
    title: "Pay & we connect you to the owner",
    description: "A small, one-time payment gets you a direct call with the owner.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-brand-bg">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          How It Works
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-brand-divider bg-white p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
                {step.number}
              </span>
              <h3 className="mt-3 font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          You pay only when you choose to talk to the owner.
        </p>
      </div>
    </section>
  );
}

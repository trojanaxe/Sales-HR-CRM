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
    <section className="bg-ink-dark">
      <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
        <h2 className="font-whisper text-center text-heading text-white">How It Works</h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-3xl border border-brand-divider bg-surface p-6 sm:p-8"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-body-sm font-whisper text-white">
                {step.number}
              </span>
              <h3 className="font-whisper mt-4 text-subheading text-ink">{step.title}</h3>
              <p className="mt-2 text-body-sm text-ink-muted">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-body-sm font-whisper text-white/70">
          You pay only when you choose to talk to the owner.
        </p>
      </div>
    </section>
  );
}

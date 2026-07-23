// Runs once when the Next.js server process boots (App Router
// instrumentation hook, stable since Next 15). There is no cron/queue
// infrastructure in this app, and the 3-hour claim SLA (Part 6) must keep
// working even if every browser tab is closed — so a plain in-process
// interval is the simplest correct option here: the server is a long-running
// Node process (`output: "standalone"`, started via `next start`/`next dev`),
// and each tick recomputes overdue requirements straight from the database
// rather than tracking a per-requirement timer in memory, so a server
// restart just picks the check back up on the next tick instead of losing it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkAndEscalateOverdueRequirements } = await import("./lib/requirements/escalation");
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;

  const run = () => {
    checkAndEscalateOverdueRequirements().catch((e) => console.error("Requirement escalation check failed:", e));
  };

  setTimeout(run, 15_000);
  setInterval(run, CHECK_INTERVAL_MS);
}

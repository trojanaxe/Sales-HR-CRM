"use client";
import { useEffect, useState } from "react";

const SLA_MS = 3 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / (60 * 60 * 1000));
  const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

// The 3-hour claim SLA (Part 6) is computed on the backend from
// `availableSince`; this just re-renders the countdown client-side every
// minute so HR sees it tick down without a full page reload.
export default function ClaimTimer({ availableSince }: { availableSince: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const deadline = new Date(availableSince).getTime() + SLA_MS;
  const remaining = deadline - now;
  const overdue = remaining <= 0;

  return (
    <span className={`text-xs font-semibold ${overdue ? "text-rose-400" : "text-amber-300"}`}>
      {overdue ? `Overdue by ${formatRemaining(remaining)}` : `${formatRemaining(remaining)} left to claim`}
    </span>
  );
}

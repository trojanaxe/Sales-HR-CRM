// Fire-and-forget email transport, mirroring the Slack webhook pattern in
// src/lib/slack.ts: no-op silently if SMTP isn't configured (no required
// secrets to run the app locally), never throws into the caller.
import nodemailer from "nodemailer";

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  cachedTransport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return cachedTransport;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const transport = getTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "Sietrix CRM <noreply@sietrix.com>",
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

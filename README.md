# Homespy

A focused, trust-driven MVP for verified rental listings in Bangalore. Mobile-first,
no user accounts, no automation — renters browse for free and pay only when they
want to talk to an owner, via a pre-filled WhatsApp message.

Built with Next.js (App Router) + Tailwind CSS + Prisma (SQLite).

## Stack & architecture

- **Next.js 16** (App Router, TypeScript) — public site + admin panel in one app
- **Tailwind CSS v4** — brand palette (`#07a454` primary) defined in `src/app/globals.css`
- **Prisma + SQLite** — single `Listing` model, see `prisma/schema.prisma`
- **Admin auth** — one shared password (env var), signed httpOnly JWT cookie, gated by `src/proxy.ts`
- **Photo uploads** — saved to `public/uploads/` on the server's local disk

## Getting started

```bash
npm install
cp .env.example .env   # then edit ADMIN_PASSWORD, SESSION_SECRET, WHATSAPP_NUMBER
npx prisma migrate dev # creates prisma/dev.db and applies the schema
npm run db:seed        # loads 4 sample Bangalore listings
npm run dev
```

Visit `http://localhost:3000` for the public site and `http://localhost:3000/admin`
for the admin panel (password from `.env`).

## Admin panel

- `/admin/login` — single shared password login (no user accounts)
- `/admin` — dashboard listing every property with Edit / Delete
- `/admin/listings/new` and `/admin/listings/[id]/edit` — full form covering every
  field shown on the public details page: identity, pricing, overview, utilities,
  tenant info, about text, map embed URL, and photo upload
- Availability (`Available` / `Under Discussion` / `Rented`) is changed from the same form
- Map location is set by pasting a Google Maps **Embed** URL (Google Maps → Share →
  Embed a map → copy the `src` URL) into the "Map embed URL" field

## WhatsApp handoff

Every property has a hard-coded `propertyId`. The sticky "Request Owner Call – ₹199"
button and property cards link to:

```
https://wa.me/<WHATSAPP_NUMBER>?text=Hi%20I%20am%20interested%20in%20Property%20ID%20<propertyId>.%20Please%20help%20me%20connect%20with%20the%20owner.
```

The message text is fixed — no free text — so every enquiry arrives in the same
format for manual call connection. See `src/lib/whatsapp.ts`.

## Environment variables

| Variable          | Purpose                                                        |
| ------------------ | --------------------------------------------------------------- |
| `DATABASE_URL`     | SQLite file path (default `file:./dev.db`)                     |
| `ADMIN_PASSWORD`   | Shared password for `/admin` login                              |
| `SESSION_SECRET`   | Random secret used to sign the admin session cookie — change in production |
| `WHATSAPP_NUMBER`  | WhatsApp Business number (digits only, with country code)      |

## ⚠️ Hosting note (important)

This app stores listings in a **SQLite file** and uploaded photos on the **local
disk** (`public/uploads/`). That works great on a persistent Node host — **Railway,
Render, a VPS/EC2, DigitalOcean App Platform**, etc. — where the filesystem
survives between requests.

It will **not** work correctly on serverless platforms with ephemeral/read-only
filesystems (e.g. **Vercel, Netlify**) — the database and uploaded photos would be
wiped on every deploy/cold start. If you need serverless hosting, swap
`DATABASE_URL` for a hosted Postgres (e.g. Neon/Supabase) and point uploads at an
object store (e.g. S3/Cloudinary) instead — the rest of the app (schema, forms,
routes) does not need to change.

## Scripts

```bash
npm run dev         # start dev server
npm run build        # production build
npm run start        # run the production build
npm run lint          # eslint
npm run db:migrate   # prisma migrate dev
npm run db:seed       # seed sample listings
npm run db:studio    # Prisma Studio (browse/edit the DB visually)
```

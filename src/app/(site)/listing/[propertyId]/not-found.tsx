import Link from "next/link";

export default function ListingNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-whisper text-heading-sm text-ink">Listing not found</h1>
      <p className="mt-3 text-body-sm text-ink-muted">
        This property may have been removed or the link is incorrect.
      </p>
      <Link
        href="/"
        className="font-whisper mt-6 inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-body-sm text-white shadow-cta"
      >
        Browse available flats
      </Link>
    </div>
  );
}

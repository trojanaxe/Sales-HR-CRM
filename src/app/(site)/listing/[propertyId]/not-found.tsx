import Link from "next/link";

export default function ListingNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-gray-900">Listing not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        This property may have been removed or the link is incorrect.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white"
      >
        Browse available flats
      </Link>
    </div>
  );
}

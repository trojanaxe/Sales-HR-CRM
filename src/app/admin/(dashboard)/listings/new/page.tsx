import { ListingForm } from "@/components/admin/ListingForm";

export const metadata = { title: "Add Listing — Homespy Admin" };

export default function NewListingPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Add Listing</h1>
      <p className="mt-1 text-sm text-gray-500">
        Fill in all fields — this is exactly what renters will see on the details page.
      </p>
      <div className="mt-6">
        <ListingForm />
      </div>
    </div>
  );
}

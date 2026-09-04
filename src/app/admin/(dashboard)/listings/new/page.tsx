import { getAllCitiesWithAreas } from "@/lib/areas";
import { ListingForm } from "@/components/admin/ListingForm";

export const metadata = { title: "Add Listing — Homespy Admin" };
export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const cities = await getAllCitiesWithAreas();

  return (
    <div>
      <h1 className="font-whisper text-heading-sm text-ink">Add Listing</h1>
      <p className="mt-2 text-body-sm text-ink-muted">
        Fill in all fields — this is exactly what renters will see on the details page.
      </p>
      <div className="mt-6">
        <ListingForm cities={cities} />
      </div>
    </div>
  );
}

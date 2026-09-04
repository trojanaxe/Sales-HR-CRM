import { getAllCitiesWithAreas } from "@/lib/areas";
import { AreasManager } from "@/components/admin/AreasManager";

export const metadata = { title: "Areas & Cities — Homespy Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAreasPage() {
  const cities = await getAllCitiesWithAreas();

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-gray-900">Areas &amp; Cities</h1>
      <p className="mt-1 text-sm text-gray-500">
        Disabled cities/areas are hidden from the public site and listing dropdowns immediately —
        no redeploy needed. Deleting an area or city that still has listings is blocked; disable
        it instead.
      </p>
      <div className="mt-6">
        <AreasManager cities={cities} />
      </div>
    </div>
  );
}

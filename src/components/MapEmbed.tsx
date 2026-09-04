import { MapPinIcon } from "./icons";

export function MapEmbed({ mapEmbedUrl, area }: { mapEmbedUrl: string | null; area: string }) {
  if (!mapEmbedUrl) {
    return (
      <div className="flex items-center gap-2 rounded-3xl bg-brand-bg p-4 text-body-sm text-ink-muted">
        <MapPinIcon className="h-4 w-4 shrink-0" />
        Exact location available on request — property is in {area}.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-brand-divider">
      <iframe
        src={mapEmbedUrl}
        title={`Map location for ${area}`}
        className="h-64 w-full sm:h-80"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

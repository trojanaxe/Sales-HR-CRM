import { buildWhatsAppLink } from "@/lib/whatsapp";

export function StickyBottomCTA({ propertyId }: { propertyId: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-divider bg-white/95 p-3 backdrop-blur [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
      <a
        href={buildWhatsAppLink(propertyId)}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex max-w-5xl items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-center text-base font-semibold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-[0.99]"
      >
        Request Owner Call – ₹199
      </a>
    </div>
  );
}

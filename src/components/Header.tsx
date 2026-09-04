import Link from "next/link";
import { Logo } from "./Logo";
import { WhatsAppIcon } from "./icons";
import { getServiceAreaNames } from "@/lib/areas";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export async function Header() {
  const areaNames = await getServiceAreaNames();

  return (
    <header className="sticky top-0 z-40 border-b border-brand-divider bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        {areaNames.length > 0 && (
          <p className="hidden truncate text-xs text-gray-500 sm:block sm:text-sm">
            Serving {areaNames.join(", ")}
          </p>
        )}

        <a
          href={buildGeneralWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:brightness-95"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </a>
      </div>
      {areaNames.length > 0 && (
        <p className="block truncate bg-brand-bg px-4 py-1 text-center text-xs text-gray-500 sm:hidden">
          Serving {areaNames.join(" · ")}
        </p>
      )}
    </header>
  );
}

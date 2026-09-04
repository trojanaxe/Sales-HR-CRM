"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }

  function scrollToIndex(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-brand-bg text-body-sm text-ink-muted sm:aspect-[16/9] sm:rounded-3xl">
        No photos yet
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar snap-x-mandatory flex aspect-[4/3] w-full snap-mandatory overflow-x-auto scroll-smooth bg-brand-bg sm:aspect-[16/9] sm:rounded-3xl"
      >
        {images.map((src, i) => (
          <div key={src + i} className="relative h-full w-full flex-none snap-center">
            <Image
              src={src}
              alt={`${alt} — photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
          <span className="text-caption font-whisper absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-white">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

"use client";

import { useRef } from "react";
import Link from "next/link";

export function CategoryCarousel({
  categories,
}: {
  categories: { id: string; slug: string; name: string; image: string | null }[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Apunta directo al offsetLeft real de la tarjeta siguiente/anterior en
  // vez de moverse un paso fijo en px (calculado a partir de la primera
  // tarjeta) — con scroll-snap, un paso que no calza exacto con el punto de
  // snap hace que la animación arranque y el navegador la reviente de
  // vuelta al toque, y el click se siente como que "no hace nada".
  function scroll(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards.length === 0) return;
    const current = el.scrollLeft;
    let index = cards.findIndex((c) => c.offsetLeft >= current - 4);
    if (index === -1) index = cards.length - 1;
    const target = Math.min(cards.length - 1, Math.max(0, index + dir));
    el.scrollTo({ left: cards[target].offsetLeft, behavior: "smooth" });
  }

  const arrowClasses =
    "flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-white p-3 text-brand-pink-dark shadow-md ring-1 ring-black/10 transition-colors hover:bg-brand-pink hover:text-white";

  return (
    <div>
      <div className="flex items-center gap-4">
        <button onClick={() => scroll(-1)} aria-label="Anterior" className={`hidden sm:flex ${arrowClasses}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div
          ref={scrollerRef}
          className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="group flex w-[calc((100%-1rem)/2)] shrink-0 snap-start flex-col items-center rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]"
            >
              {cat.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-32 w-32 rounded-xl object-cover"
                />
              ) : (
                <div className="h-32 w-32 rounded-xl bg-brand-soft" />
              )}

              <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-full bg-white py-2 pl-4 pr-2 shadow-md ring-1 ring-black/10 transition-colors group-hover:bg-brand-pink">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-brand-ink transition-colors group-hover:text-white">
                  {cat.name}
                </p>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white transition-colors group-hover:bg-white group-hover:text-brand-pink-dark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <button onClick={() => scroll(1)} aria-label="Siguiente" className={`hidden sm:flex ${arrowClasses}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 sm:hidden">
        <button onClick={() => scroll(-1)} aria-label="Anterior" className={arrowClasses}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button onClick={() => scroll(1)} aria-label="Siguiente" className={arrowClasses}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

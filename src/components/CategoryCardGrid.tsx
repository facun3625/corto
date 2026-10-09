import Link from "next/link";

export function CategoryCardGrid({
  categories,
}: {
  categories: { id: string; slug: string; name: string; image: string | null; count: number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/categoria/${cat.slug}`}
          className="group flex flex-col items-center rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          {cat.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cat.image} alt={cat.name} className="h-32 w-32 rounded-xl object-cover" />
          ) : (
            <div className="h-32 w-32 rounded-xl bg-brand-soft" />
          )}

          <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-full bg-white py-2 pl-4 pr-2 shadow-md ring-1 ring-black/10 transition-colors group-hover:bg-brand-pink">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-brand-ink transition-colors group-hover:text-white">
                {cat.name}
              </p>
              <p className="text-[11px] text-brand-muted transition-colors group-hover:text-white/80">
                {cat.count} producto{cat.count === 1 ? "" : "s"}
              </p>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white transition-colors group-hover:bg-white group-hover:text-brand-pink-dark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

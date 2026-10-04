import { notFound } from "next/navigation";
import { getAllCategories } from "@/lib/categories";
import { getProductsPage, getProductCountsByCategory } from "@/lib/products";
import { CategorySidebar } from "@/components/CategorySidebar";
import { ShopControls } from "@/components/ShopControls";
import { ProductCard } from "@/components/ProductCard";
import { Pagination } from "@/components/Pagination";
import { ScrollToTop } from "@/components/ScrollToTop";
import { logSearch } from "@/lib/searchLog";

const PAGE_SIZE = 24;

export async function ShopView({
  categoryId,
  searchParams,
}: {
  categoryId?: string;
  searchParams: { q?: string; page?: string; etiqueta?: string; ofertas?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const tagSlug = /^[a-z0-9-]{1,80}$/.test(searchParams.etiqueta ?? "") ? searchParams.etiqueta : undefined;
  const onlyOffers = searchParams.ofertas === "1";
  const categories = await getAllCategories();

  let category = null;
  if (categoryId) {
    category = categories.find((c) => c.id === categoryId);
    if (!category) notFound();
  }

  const basePath = category ? `/categoria/${category.slug}` : "/tienda";

  const [counts, { products, total }] = await Promise.all([
    getProductCountsByCategory(categories),
    getProductsPage({
      categoryId,
      query: query || undefined,
      tagSlug,
      onlyOffers,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Búsqueda enviada (solo la primera página: paginar no es otra búsqueda)
  if (query && page === 1) logSearch(query, total);

  // Suma solo las categorías de nivel superior para evitar contar productos dos veces
  // (los conteos ya están "enrollados" con sus descendientes).
  const topLevelTotal = categories
    .filter((c) => c.parentId === null)
    .reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0);

  return (
    <div className="min-h-screen bg-white px-3 py-8 sm:px-6 sm:py-12">
      <ScrollToTop watch={`${categoryId ?? "all"}-${query}-${page}`} />
      <main className="mx-auto max-w-6xl">
        <h1 className="mb-1 text-3xl font-bold text-brand-ink">{category ? category.name : "Tienda"}</h1>
        <p className="mb-8 text-brand-muted">
          {category ? `${total} productos` : "Elegí una categoría para ver los productos."}
        </p>

        <div className="flex flex-col gap-8 sm:flex-row">
          <CategorySidebar
            categories={categories}
            counts={counts}
            grandTotal={topLevelTotal}
            activeCategoryId={categoryId}
          />

          <div className="min-w-0 flex-1">
            <ShopControls query={query} />
            {(tagSlug || onlyOffers) && (
              <p className="mt-3 text-sm text-brand-ink">
                Filtrando por {onlyOffers ? "ofertas" : `etiqueta “${tagSlug}”`}.{" "}
                <a href={basePath} className="font-medium text-brand-pink-dark hover:underline">Quitar filtro</a>
              </p>
            )}

            <p className="mb-4 mt-4 text-xs uppercase tracking-widest text-brand-muted">
              Mostrando <span className="font-semibold text-brand-pink-dark">{products.length}</span> de{" "}
              {total} productos
            </p>

            {products.length === 0 ? (
              <p className="text-brand-muted">No encontramos productos.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                <Pagination
                  basePath={basePath}
                  query={query || undefined}
                  extraParams={{ etiqueta: tagSlug, ofertas: onlyOffers ? "1" : undefined }}
                  currentPage={page}
                  totalPages={totalPages}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

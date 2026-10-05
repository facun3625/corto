import Link from "next/link";
import { getAdminProductsPage, getProductCountsByCategory } from "@/lib/products";
import { getAllCategories } from "@/lib/categories";
import { Pagination } from "@/components/Pagination";
import { LiveSearchInput } from "./LiveSearchInput";
import { CategoryFilterSelect } from "./CategoryFilterSelect";
import { ProductsTable } from "./ProductsTable";

const PAGE_SIZE = 25;

type SortField = "name" | "category" | "price" | "stock";

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    minStock?: string;
    maxStock?: string;
    sort?: string;
    dir?: string;
    state?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() ?? "";
  const categoryId = params.categoryId || undefined;
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const minStock = params.minStock ? Number(params.minStock) : undefined;
  const maxStock = params.maxStock ? Number(params.maxStock) : undefined;
  const sort =
    params.sort === "price" || params.sort === "stock" || params.sort === "category" ? params.sort : "name";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const state = params.state === "visible" || params.state === "draft" || params.state === "scheduled" ? params.state : undefined;

  const type = params.type === "simple" || params.type === "variable" ? params.type : undefined;

  const categories = await getAllCategories();

  const [counts, { products, total }] = await Promise.all([
    getProductCountsByCategory(categories),
    getAdminProductsPage({
      query: query || undefined,
      categoryId,
      state,
      type,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      sort,
      dir,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const sortedCategories = categories
    .filter((c) => (counts.get(c.id) ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sortedAllCategories = [...categories].map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));

  const hasFilters = Boolean(
    query || categoryId || state || type || minPrice !== undefined || maxPrice !== undefined || minStock !== undefined || maxStock !== undefined
  );

  const extraParams = {
    categoryId: params.categoryId,
    state,
    type,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minStock: params.minStock,
    maxStock: params.maxStock,
    sort: params.sort,
    dir: params.dir,
  };

  function sortHref(field: SortField) {
    const nextDir = sort === field && dir === "asc" ? "desc" : "asc";
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (params.categoryId) p.set("categoryId", params.categoryId);
    if (state) p.set("state", state);
    if (type) p.set("type", type);
    if (params.minPrice) p.set("minPrice", params.minPrice);
    if (params.maxPrice) p.set("maxPrice", params.maxPrice);
    if (params.minStock) p.set("minStock", params.minStock);
    if (params.maxStock) p.set("maxStock", params.maxStock);
    p.set("sort", field);
    p.set("dir", nextDir);
    return `/admin/productos?${p.toString()}`;
  }

  const fieldClasses =
    "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-brand-ink focus:border-brand-pink focus:outline-none";
  const labelClasses = "mb-1 block text-xs font-medium text-brand-muted";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-ink">Productos</h1>
            <p className="mt-1 text-sm text-brand-muted">{total} productos en el catálogo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/admin/categorias" className="rounded-lg border border-black/10 px-3 py-2 font-medium text-brand-ink hover:bg-brand-soft">Categorías</Link>
            <Link href="/admin/etiquetas" className="rounded-lg border border-black/10 px-3 py-2 font-medium text-brand-ink hover:bg-brand-soft">Etiquetas</Link>
            <Link href="/admin/atributos" className="rounded-lg border border-black/10 px-3 py-2 font-medium text-brand-ink hover:bg-brand-soft">Atributos</Link>
            <Link href="/admin/productos/importar" className="rounded-lg border border-black/10 px-3 py-2 font-medium text-brand-ink hover:bg-brand-soft">Precios y stock (CSV)</Link>
            <Link href="/admin/productos/nuevo" className="rounded-lg bg-brand-pink px-4 py-2 font-semibold text-white hover:bg-brand-pink-dark">+ Nuevo producto</Link>
          </div>
        </div>

        <form className="mt-6 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className={labelClasses}>Nombre</label>
            <LiveSearchInput defaultValue={query} />
          </div>

          <div className="w-48">
            <label className={labelClasses}>Categoría</label>
            <CategoryFilterSelect defaultValue={params.categoryId ?? ""} categories={sortedCategories} />
          </div>

          {/* Precio/stock necesitan "Filtrar" (son rangos, no tiene sentido
              buscar en cada tecla) — se agrupan aparte para que se note que
              no son instantáneos como Nombre/Categoría. */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-brand-soft/30 p-3">
            <div className="w-36">
              <label className={labelClasses}>Estado</label>
              <select name="state" defaultValue={state ?? ""} className={fieldClasses}>
                <option value="">Todos</option>
                <option value="visible">Publicados</option>
                <option value="draft">Borradores</option>
                <option value="scheduled">Programados / vencidos</option>
              </select>
            </div>
            <div className="w-36">
              <label className={labelClasses}>Tipo</label>
              <select name="type" defaultValue={type ?? ""} className={fieldClasses}>
                <option value="">Todos</option>
                <option value="simple">Simples</option>
                <option value="variable">Variables</option>
              </select>
            </div>
            <div className="w-24">
              <label className={labelClasses}>Precio min</label>
              <input type="number" name="minPrice" defaultValue={params.minPrice ?? ""} min={0} className={fieldClasses} />
            </div>
            <div className="w-24">
              <label className={labelClasses}>Precio max</label>
              <input type="number" name="maxPrice" defaultValue={params.maxPrice ?? ""} min={0} className={fieldClasses} />
            </div>

            <div className="w-24">
              <label className={labelClasses}>Stock min</label>
              <input type="number" name="minStock" defaultValue={params.minStock ?? ""} min={0} className={fieldClasses} />
            </div>
            <div className="w-24">
              <label className={labelClasses}>Stock max</label>
              <input type="number" name="maxStock" defaultValue={params.maxStock ?? ""} min={0} className={fieldClasses} />
            </div>

            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-dark"
            >
              Filtrar
            </button>

            {hasFilters && (
              <Link
                href="/admin/productos"
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-black/5 hover:text-brand-ink"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>
      </div>

      <ProductsTable
        products={products.map((p) => ({
          id: p.id, name: p.name, sku: p.sku, type: p.type, visibility: p.visibility, featured: p.featured, manageStock: p.manageStock,
          basePrice: p.basePrice, price: p.price, stock: p.stock, categoryName: p.categoryName, thumb: p.thumb,
        }))}
        sortHref={{ name: sortHref("name"), category: sortHref("category"), price: sortHref("price"), stock: sortHref("stock") }}
        sort={sort}
        dir={dir}
        categories={sortedAllCategories}
      />

      <div className="shrink-0">
        <Pagination
          basePath="/admin/productos"
          query={query || undefined}
          currentPage={page}
          totalPages={totalPages}
          extraParams={extraParams}
        />
      </div>
    </div>
  );
}

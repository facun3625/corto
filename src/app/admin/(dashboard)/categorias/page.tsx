import { prisma } from "@/lib/prisma";
import { saveCategory, deleteCategory } from "../productos/actions";

const field =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-brand-ink focus:border-brand-pink focus:outline-none";
const label = "mb-1 block text-xs font-medium text-brand-muted";

type Row = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null; parentId: string | null; sortOrder: number; products: number };

function CategoryFields({ category, categories }: { category?: Row; categories: Row[] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="min-w-[160px] flex-1">
        <label className={label}>Nombre</label>
        <input name="name" defaultValue={category?.name} required className={field} />
      </div>
      <div className="w-44">
        <label className={label}>Categoría padre</label>
        <select name="parentId" defaultValue={category?.parentId ?? ""} className={`${field} bg-white`}>
          <option value="">— Ninguna (nivel superior)</option>
          {categories.filter((c) => c.id !== category?.id).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className={label}>Orden</label>
        <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className={field} />
      </div>
      <div className="min-w-[160px] flex-1">
        <label className={label}>URL de imagen (opcional)</label>
        <input name="imageUrl" defaultValue={category?.imageUrl ?? ""} className={field} />
      </div>
      <div className="min-w-[160px] flex-1">
        <label className={label}>Slug</label>
        <input name="slug" defaultValue={category?.slug} placeholder="automático" className={field} />
      </div>
      <button type="submit" className="cursor-pointer rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark">
        {category ? "Guardar" : "Crear"}
      </button>
    </div>
  );
}

export default async function AdminCategoriasPage() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  const categories: Row[] = rows.map((c) => ({ ...c, products: c._count.products }));

  const ordered: { cat: Row; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of categories.filter((c) => c.parentId === parentId)) {
      ordered.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <h1 className="text-2xl font-bold text-brand-ink">Categorías</h1>
      <p className="mt-1 text-sm text-brand-muted">Árbol de categorías con niveles ilimitados. Al borrar una, sus subcategorías suben al nivel superior.</p>

      <form action={saveCategory} className="mt-6 rounded-xl border border-dashed border-black/20 bg-white p-5">
        <p className="mb-3 font-semibold text-brand-ink">Nueva categoría</p>
        <CategoryFields categories={categories} />
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {ordered.map(({ cat, depth }) => (
          <div key={cat.id} className="rounded-xl border border-black/10 bg-white p-4" style={{ marginLeft: depth * 24 }}>
            <form action={saveCategory}>
              <CategoryFields category={cat} categories={categories} />
            </form>
            <form action={deleteCategory.bind(null, cat.id)} className="mt-2 flex items-center justify-between text-xs text-brand-muted">
              <span>{cat.products} producto{cat.products === 1 ? "" : "s"} · /{cat.slug}</span>
              <button type="submit" className="cursor-pointer text-red-600 hover:underline">Eliminar</button>
            </form>
          </div>
        ))}
        {ordered.length === 0 && <p className="rounded-xl border border-dashed border-black/15 bg-white p-5 text-center text-sm text-brand-muted">Todavía no hay categorías.</p>}
      </div>
    </div>
  );
}

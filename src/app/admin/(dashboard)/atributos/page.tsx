import { prisma } from "@/lib/prisma";
import { saveAttribute, deleteAttribute } from "../productos/actions";

const field =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-brand-ink focus:border-brand-pink focus:outline-none";
const label = "mb-1 block text-xs font-medium text-brand-muted";

export default async function AdminAtributosPage() {
  const attributes = await prisma.attribute.findMany({
    orderBy: { name: "asc" },
    include: { terms: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <h1 className="text-2xl font-bold text-brand-ink">Atributos</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Talle, color, material… Cada valor va en una línea (podés agregar un color así: <code>Rojo|#ff0000</code>). Los
        atributos se usan en los productos variables para armar las variantes.
      </p>

      <form action={saveAttribute} className="mt-6 rounded-xl border border-dashed border-black/20 bg-white p-5">
        <p className="mb-3 font-semibold text-brand-ink">Nuevo atributo</p>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <div>
            <label className={label}>Nombre</label>
            <input name="name" required className={field} placeholder="Talle" />
          </div>
          <div>
            <label className={label}>Valores (uno por línea)</label>
            <textarea name="terms" rows={3} className={field} placeholder={"S\nM\nL"} />
          </div>
          <button type="submit" className="cursor-pointer rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark">Crear</button>
        </div>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {attributes.map((attr) => (
          <div key={attr.id} className="rounded-xl border border-black/10 bg-white p-4">
            <form action={saveAttribute} className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={attr.id} />
              <div>
                <label className={label}>Nombre</label>
                <input name="name" defaultValue={attr.name} required className={field} />
              </div>
              <div>
                <label className={label}>Valores</label>
                <textarea name="terms" rows={Math.min(8, Math.max(3, attr.terms.length))} defaultValue={attr.terms.map((t) => (t.colorHex ? `${t.name}|${t.colorHex}` : t.name)).join("\n")} className={field} />
              </div>
              <button type="submit" className="cursor-pointer rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark">Guardar</button>
            </form>
            <form action={deleteAttribute.bind(null, attr.id)} className="mt-2 flex items-center justify-between text-xs text-brand-muted">
              <span>
                Usado en {attr._count.products} producto{attr._count.products === 1 ? "" : "s"}. Quitar un valor o borrar el atributo elimina las variantes que lo usan.
              </span>
              <button type="submit" className="cursor-pointer text-red-600 hover:underline">Eliminar</button>
            </form>
          </div>
        ))}
        {attributes.length === 0 && <p className="rounded-xl border border-dashed border-black/15 bg-white p-5 text-center text-sm text-brand-muted">Todavía no hay atributos.</p>}
      </div>
    </div>
  );
}

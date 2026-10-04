"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { saveProduct, deleteProduct, type ProductInput } from "./actions";
import { TagsInput, RelatedPicker } from "./CatalogPickers";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";
import { useConfirm } from "@/lib/useConfirm";

export type FormCategory = { id: string; name: string; parentId: string | null };
export type FormAttribute = { id: string; name: string; terms: { id: string; name: string }[] };

const field =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-brand-ink focus:border-brand-pink focus:outline-none";
const label = "mb-1 block text-xs font-medium text-brand-muted";
const card = "rounded-xl border border-black/10 bg-white p-5";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((combo) => list.map((t) => [...combo, t])), [[]]);
}

// Árbol aplanado con profundidad, para mostrar las categorías indentadas.
function flattenTree(categories: FormCategory[]) {
  const out: { cat: FormCategory; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const cat of categories.filter((c) => c.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function ProductForm({
  initial,
  categories,
  attributes,
  currency,
  allTags,
  relatedNames,
}: {
  initial: ProductInput;
  categories: FormCategory[];
  attributes: FormAttribute[];
  currency: string;
  allTags: string[];
  relatedNames: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, dialog] = useConfirm();
  const [form, setForm] = useState<ProductInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // atributo -> términos elegidos para generar variantes
  const [chosen, setChosen] = useState<Record<string, Set<string>>>(() => {
    const result: Record<string, Set<string>> = {};
    for (const attrId of initial.attributeIds) result[attrId] = new Set();
    for (const v of initial.variants) {
      for (const termId of v.termIds) {
        const attr = attributes.find((a) => a.terms.some((t) => t.id === termId));
        if (attr) (result[attr.id] ??= new Set()).add(termId);
      }
    }
    return result;
  });

  const tree = useMemo(() => flattenTree(categories), [categories]);
  const termName = useMemo(() => new Map(attributes.flatMap((a) => a.terms.map((t) => [t.id, t.name] as const))), [attributes]);
  const isVariable = form.type === "variable";

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/images", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen");
        break;
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, { url: data.url, thumbUrl: data.thumbUrl, alt: "" }] }));
    }
    setUploading(false);
  }

  function moveImage(index: number, delta: number) {
    setForm((prev) => {
      const images = [...prev.images];
      const target = index + delta;
      if (target < 0 || target >= images.length) return prev;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, images };
    });
  }

  function toggleAttribute(attrId: string) {
    const active = form.attributeIds.includes(attrId);
    set("attributeIds", active ? form.attributeIds.filter((a) => a !== attrId) : [...form.attributeIds, attrId]);
    setChosen((prev) => ({ ...prev, [attrId]: prev[attrId] ?? new Set() }));
  }

  function toggleTerm(attrId: string, termId: string) {
    setChosen((prev) => {
      const next = new Set(prev[attrId] ?? []);
      if (next.has(termId)) next.delete(termId);
      else next.add(termId);
      return { ...prev, [attrId]: next };
    });
  }

  // Crea las combinaciones que faltan (conserva las variantes ya cargadas).
  function generateVariants() {
    const attrs = form.attributeIds.filter((id) => (chosen[id]?.size ?? 0) > 0);
    if (attrs.length !== form.attributeIds.length) {
      setError("Elegí al menos un valor en cada atributo antes de generar las variantes");
      return;
    }
    setError(null);
    const combos = cartesian(attrs.map((id) => attributes.find((a) => a.id === id)!.terms.filter((t) => chosen[id].has(t.id)).map((t) => t.id)));
    const key = (ids: string[]) => [...ids].sort().join("|");
    const existing = new Set(form.variants.map((v) => key(v.termIds)));
    const wanted = new Set(combos.map(key));
    const kept = form.variants.filter((v) => wanted.has(key(v.termIds)));
    const added = combos
      .filter((c) => !existing.has(key(c)))
      .map((termIds) => ({
        sku: "",
        price: form.price,
        compareAtPrice: null,
        stock: 0,
        manageStock: true,
        enabled: true,
        termIds,
        imageUrl: null,
      }));
    set("variants", [...kept, ...added]);
  }

  function updateVariant(index: number, patch: Partial<ProductInput["variants"][number]>) {
    set("variants", form.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveProduct(form);
      if (!result.ok) return setError(result.error);
      router.push("/admin/productos");
      router.refresh();
    });
  }

  async function remove() {
    if (!form.id || !(await confirm({ title: "¿Eliminar este producto?", message: "Los pedidos ya hechos conservan su detalle.", danger: true }))) return;
    startTransition(async () => {
      await deleteProduct(form.id!);
      router.push("/admin/productos");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      {dialog}
      <div className={card}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nombre</label>
            <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Tipo</label>
            <select className={field} value={form.type} onChange={(e) => set("type", e.target.value as ProductInput["type"])}>
              <option value="simple">Simple (precio y stock únicos)</option>
              <option value="variable">Variable (talle, color, etc.)</option>
            </select>
          </div>
          <div>
            <label className={label}>Estado</label>
            <select className={field} value={form.status} onChange={(e) => set("status", e.target.value as ProductInput["status"])}>
              <option value="published">Publicado</option>
              <option value="draft">Borrador (no se ve en la tienda)</option>
            </select>
          </div>
          <div>
            <label className={label}>SKU</label>
            <input className={field} value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </div>
          <div>
            <label className={label}>URL amigable (slug)</label>
            <input className={field} value={form.slug} placeholder="se genera del nombre" onChange={(e) => set("slug", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Descripción corta</label>
            <textarea className={field} rows={2} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Descripción</label>
            <RichTextEditor
              name="description"
              initialValue={initial.description}
              onChange={(html) => set("description", html)}
              uploadImage={async (fd) => {
                const res = await fetch("/api/admin/images", { method: "POST", body: fd });
                const data = await res.json().catch(() => ({}));
                return res.ok ? { ok: true, url: data.url } : { ok: false, error: data.error ?? "No se pudo subir" };
              }}
            />
          </div>
        </div>
      </div>

      {!isVariable && (
        <div className={card}>
          <p className="mb-3 text-sm font-semibold text-brand-ink">Precio y stock ({currency})</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className={label}>Precio</label>
              <input type="number" min={0} step="0.01" className={field} value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Precio anterior (tachado)</label>
              <input type="number" min={0} step="0.01" className={field} value={form.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", num(e.target.value))} />
            </div>
            <div>
              <label className={label}>Stock</label>
              <input type="number" step="1" className={field} value={form.stock} disabled={!form.manageStock} onChange={(e) => set("stock", Math.trunc(Number(e.target.value)))} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-brand-ink">
              <input type="checkbox" checked={form.manageStock} onChange={(e) => set("manageStock", e.target.checked)} />
              Controlar stock
            </label>
          </div>
        </div>
      )}

      <div className={card}>
        <p className="mb-1 text-sm font-semibold text-brand-ink">Costo y promoción</p>
        <p className="mb-3 text-xs text-brand-muted">
          El costo es solo para vos. El precio promocional se aplica solo entre las fechas elegidas (vacías = sin límite) y el
          precio normal se muestra tachado.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={label}>Precio de costo</label>
            <input type="number" min={0} step="0.01" className={field} value={form.costPrice ?? ""} onChange={(e) => set("costPrice", num(e.target.value))} />
          </div>
          {!isVariable && (
            <div>
              <label className={label}>Precio promocional</label>
              <input type="number" min={0} step="0.01" className={field} value={form.promoPrice ?? ""} onChange={(e) => set("promoPrice", num(e.target.value))} />
            </div>
          )}
          <div>
            <label className={label}>Promoción desde</label>
            <input type="datetime-local" className={field} value={isoToLocalInput(form.promoStartsAt)} onChange={(e) => set("promoStartsAt", localInputToIso(e.target.value))} />
          </div>
          <div>
            <label className={label}>Promoción hasta</label>
            <input type="datetime-local" className={field} value={isoToLocalInput(form.promoEndsAt)} onChange={(e) => set("promoEndsAt", localInputToIso(e.target.value))} />
          </div>
        </div>
        {isVariable && <p className="mt-2 text-xs text-brand-muted">En los productos variables el precio promocional se carga en cada variante (columna “Promo”) y usa estas fechas.</p>}
      </div>

      {isVariable && (
        <div className={card}>
          <p className="mb-1 text-sm font-semibold text-brand-ink">Variantes</p>
          <p className="mb-4 text-xs text-brand-muted">
            Elegí los atributos y sus valores, y generá las combinaciones. Cada una tiene su precio, stock y SKU.
            {attributes.length === 0 && " Todavía no hay atributos: creálos en Atributos."}
          </p>

          <div className="flex flex-col gap-3">
            {attributes.map((attr) => {
              const active = form.attributeIds.includes(attr.id);
              return (
                <div key={attr.id} className="rounded-lg border border-black/10 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-ink">
                    <input type="checkbox" checked={active} onChange={() => toggleAttribute(attr.id)} />
                    {attr.name}
                  </label>
                  {active && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attr.terms.map((term) => (
                        <label key={term.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-xs">
                          <input type="checkbox" checked={chosen[attr.id]?.has(term.id) ?? false} onChange={() => toggleTerm(attr.id, term.id)} />
                          {term.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" onClick={generateVariants} className="mt-4 cursor-pointer rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark">
            Generar variantes
          </button>

          {form.variants.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-xs uppercase text-brand-muted">
                    <th className="py-2 pr-2">Variante</th>
                    <th className="px-2">SKU</th>
                    <th className="px-2">Precio</th>
                    <th className="px-2">Anterior</th>
                    <th className="px-2">Promo</th>
                    <th className="px-2">Stock</th>
                    <th className="px-2">Imagen</th>
                    <th className="px-2">Activa</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, i) => (
                    <tr key={v.id ?? v.termIds.join("-")} className="border-b border-black/5">
                      <td className="py-2 pr-2 font-medium text-brand-ink">{v.termIds.map((t) => termName.get(t) ?? "?").join(" / ")}</td>
                      <td className="px-2"><input className={field} value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} /></td>
                      <td className="w-28 px-2"><input type="number" min={0} step="0.01" className={field} value={v.price} onChange={(e) => updateVariant(i, { price: Number(e.target.value) })} /></td>
                      <td className="w-28 px-2"><input type="number" min={0} step="0.01" className={field} value={v.compareAtPrice ?? ""} onChange={(e) => updateVariant(i, { compareAtPrice: num(e.target.value) })} /></td>
                      <td className="w-28 px-2"><input type="number" min={0} step="0.01" className={field} value={v.promoPrice ?? ""} onChange={(e) => updateVariant(i, { promoPrice: num(e.target.value) })} /></td>
                      <td className="w-24 px-2"><input type="number" step="1" className={field} value={v.stock} onChange={(e) => updateVariant(i, { stock: Math.trunc(Number(e.target.value)) })} /></td>
                      <td className="w-32 px-2">
                        <select className={field} value={v.imageUrl ?? ""} onChange={(e) => updateVariant(i, { imageUrl: e.target.value || null })}>
                          <option value="">—</option>
                          {form.images.map((img, n) => (
                            <option key={img.url} value={img.url}>Imagen {n + 1}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2"><input type="checkbox" checked={v.enabled} onChange={(e) => updateVariant(i, { enabled: e.target.checked })} /></td>
                      <td className="px-2">
                        <button type="button" onClick={() => set("variants", form.variants.filter((_, n) => n !== i))} className="cursor-pointer text-xs text-red-600 hover:underline">Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className={card}>
        <p className="mb-3 text-sm font-semibold text-brand-ink">Imágenes</p>
        <div className="flex flex-wrap gap-3">
          {form.images.map((img, i) => (
            <div key={img.url} className="w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbUrl ?? img.url} alt="" className="h-28 w-28 rounded-lg border border-black/10 object-cover" />
              <div className="mt-1 flex items-center justify-between text-xs">
                <button type="button" onClick={() => moveImage(i, -1)} className="cursor-pointer px-1 hover:text-brand-pink-dark" aria-label="Mover a la izquierda">←</button>
                <span className="text-brand-muted">{i === 0 ? "Principal" : i + 1}</span>
                <button type="button" onClick={() => moveImage(i, 1)} className="cursor-pointer px-1 hover:text-brand-pink-dark" aria-label="Mover a la derecha">→</button>
                <button type="button" onClick={() => set("images", form.images.filter((_, n) => n !== i))} className="cursor-pointer px-1 text-red-600" aria-label="Quitar">✕</button>
              </div>
            </div>
          ))}
          <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-black/20 text-center text-xs text-brand-muted hover:border-brand-pink">
            {uploading ? "Subiendo…" : "+ Subir imágenes"}
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 text-sm font-semibold text-brand-ink">Categorías</p>
        {tree.length === 0 ? (
          <p className="text-xs text-brand-muted">Todavía no hay categorías: creálas en Categorías.</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-1 overflow-auto">
            {tree.map(({ cat, depth }) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm text-brand-ink" style={{ paddingLeft: depth * 18 }}>
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(cat.id)}
                  onChange={(e) => set("categoryIds", e.target.checked ? [...form.categoryIds, cat.id] : form.categoryIds.filter((c) => c !== cat.id))}
                />
                {cat.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <p className="mb-1 text-sm font-semibold text-brand-ink">Programar publicación</p>
        <p className="mb-3 text-xs text-brand-muted">
          Un producto en estado “Publicado” se ve desde la fecha de publicación hasta la de despublicación. Vacías = visible siempre.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Mostrar desde</label>
            <input type="datetime-local" className={field} value={isoToLocalInput(form.publishAt)} onChange={(e) => set("publishAt", localInputToIso(e.target.value))} />
          </div>
          <div>
            <label className={label}>Ocultar desde</label>
            <input type="datetime-local" className={field} value={isoToLocalInput(form.unpublishAt)} onChange={(e) => set("unpublishAt", localInputToIso(e.target.value))} />
          </div>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 text-sm font-semibold text-brand-ink">Etiquetas</p>
        <TagsInput tags={form.tags} onChange={(tags) => set("tags", tags)} suggestions={allTags} />
      </div>

      <div className={card}>
        <p className="mb-1 text-sm font-semibold text-brand-ink">Productos recomendados</p>
        <p className="mb-3 text-xs text-brand-muted">Se muestran en la página del producto como “También te puede interesar”. Si no elegís ninguno, se sugieren productos de la misma categoría.</p>
        <RelatedPicker value={form.relatedIds} onChange={(ids) => set("relatedIds", ids)} selfId={form.id} initialNames={relatedNames} />
      </div>

      <div className={card}>
        <p className="mb-3 text-sm font-semibold text-brand-ink">Envío y otros datos</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {(["weight", "width", "height", "length"] as const).map((key) => (
            <div key={key}>
              <label className={label}>{{ weight: "Peso (kg)", width: "Ancho (cm)", height: "Alto (cm)", length: "Largo (cm)" }[key]}</label>
              <input type="number" min={0} step="0.01" className={field} value={form[key] ?? ""} onChange={(e) => set(key, num(e.target.value))} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className={label}>Video (URL, opcional)</label>
            <input className={field} value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-brand-ink sm:col-span-2">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
            Producto destacado
          </label>
          <div className="sm:col-span-2">
            <label className={label}>Título SEO</label>
            <input className={field} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Descripción SEO</label>
            <input className={field} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-black/10 bg-white px-4 py-3 sm:left-auto md:left-56">
        <button type="button" onClick={submit} disabled={pending || uploading} className="cursor-pointer rounded-lg bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar producto"}
        </button>
        <button type="button" onClick={() => router.push("/admin/productos")} className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-brand-muted hover:bg-black/5">
          Cancelar
        </button>
        {form.id && (
          <button type="button" onClick={remove} className="ml-auto cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

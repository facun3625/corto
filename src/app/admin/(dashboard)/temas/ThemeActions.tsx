"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activateTheme, openBaseTheme, resetBaseTheme, createThemeFromTemplate, deactivateTheme, deleteTheme, duplicateTheme, scheduleTheme } from "./actions";
import { useConfirm } from "@/lib/useConfirm";

const btn = "cursor-pointer rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-soft disabled:opacity-50";
// Botón principal: no hereda el hover claro de `btn` (si no, el texto blanco queda invisible al pasar el mouse)
const btnPrimary = "cursor-pointer rounded-lg border border-transparent bg-brand-pink px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50";

export function ThemeCardActions({ id, enabled, hasSchedule, isLive, expired }: { id: string; enabled: boolean; hasSchedule: boolean; isLive: boolean; expired?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, dialog] = useConfirm();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {dialog}
      <a href={`/api/admin/themes/preview?id=${id}`} className={btn}>Vista previa</a>
      <Link href={`/admin/temas/${id}`} className={btn}>Editar</Link>
      {enabled ? (
        <>
          {expired && (
            <button disabled={pending} className={btnPrimary} title="Quita la fecha de fin vencida y lo muestra desde ahora" onClick={() => start(async () => { await activateTheme(id); router.refresh(); })}>
              Reactivar
            </button>
          )}
          <button disabled={pending} className={btn} onClick={() => start(async () => { await deactivateTheme(id); router.refresh(); })}>Apagar</button>
        </>
      ) : (
        <>
          <button disabled={pending} className={btnPrimary} onClick={() => start(async () => { await activateTheme(id); router.refresh(); })}>
            Activar ahora
          </button>
          {hasSchedule && (
            <button disabled={pending} className={btn} title="Entra y sale solo según sus fechas" onClick={() => start(async () => { await scheduleTheme(id); router.refresh(); })}>
              Programar
            </button>
          )}
        </>
      )}
      <button disabled={pending} className={btn} onClick={() => start(async () => { const copy = await duplicateTheme(id); if (copy) router.push(`/admin/temas/${copy.id}`); })}>Duplicar</button>
      <button
        disabled={pending}
        className={`${btn} text-red-600`}
        onClick={async () => (await confirm(isLive ? { title: "¿Eliminar el tema activo?", message: "Este tema se está mostrando ahora: la tienda vuelve a su aspecto base.", danger: true } : { title: "¿Eliminar este tema?", danger: true })) && start(async () => { await deleteTheme(id); router.refresh(); })}
      >
        Eliminar
      </button>
    </div>
  );
}

export function NewFromTemplate({ templates }: { templates: { key: string; name: string; description: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const create = (key: string) => start(async () => { const { id } = await createThemeFromTemplate(key); router.push(`/admin/temas/${id}`); });
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <button key={t.key} disabled={pending} title={t.description} onClick={() => create(t.key)} className="cursor-pointer rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-brand-ink hover:border-brand-pink hover:text-brand-pink-dark disabled:opacity-50">
          {t.name}
        </button>
      ))}
      <button disabled={pending} onClick={() => create("")} className="cursor-pointer rounded-full border border-dashed border-black/20 px-4 py-2 text-sm text-brand-muted hover:border-brand-pink disabled:opacity-50">
        En blanco
      </button>
    </div>
  );
}

// Aspecto base: lo que se ve cuando no hay ninguna campaña activa. Se edita acá; no tiene fechas ni se puede borrar.
export function BaseThemeCard({ baseId, colors, campaignActive }: { baseId: string | null; colors: string[] | null; campaignActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, dialog] = useConfirm();
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-white">
      {dialog}
      {colors && (
        <div className="flex h-8">
          {colors.map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-brand-ink">Aspecto base de la tienda</p>
          <p className="text-xs text-brand-muted">
            Es el aspecto de siempre: se ve cuando no hay ninguna campaña activa{campaignActive ? " (ahora hay una campaña encima)" : ""}. Cambiale colores, tipografía, barra de anuncio, portada y banners.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {baseId && <a href={`/api/admin/themes/preview?id=${baseId}`} className={btn}>Vista previa</a>}
          <button
            disabled={pending}
            className={btnPrimary}
            onClick={() => start(async () => { const { id } = await openBaseTheme(); router.push(`/admin/temas/${id}`); })}
          >
            Editar aspecto base
          </button>
          {baseId && (
            <button
              disabled={pending}
              className={btn}
              onClick={async () =>
                (await confirm({ title: "¿Restablecer el aspecto base?", message: "Vuelve a los colores y estilos originales de la tienda.", confirmLabel: "Restablecer", danger: true })) &&
                start(async () => { await resetBaseTheme(baseId); router.refresh(); })
              }
            >
              Restablecer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { WhatsAppIcon } from "@/components/icons";
import { buildWhatsAppLink, isLikelyPhone } from "@/lib/whatsapp";
import { CopyEmailsButton } from "./CopyEmailsButton";
import { deleteWaitlistEntry } from "./actions";
import { getStoreSettingsRow } from "@/lib/settings";
import { storeNameOf } from "@/lib/storeName";

export default async function AdminListaEsperaPage() {
  const [entries, settings] = await Promise.all([prisma.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } }), getStoreSettingsRow()]);
  const emails = [...new Set(entries.map((e) => e.email))];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-brand-ink">Lista de espera</h1>
        <p className="mt-1 text-sm text-brand-muted">
          {entries.length} clientes esperando que vuelva el stock de algún producto. Se anotan solos desde "Avisarme
          cuando haya stock" en la tienda — no se les avisa automático todavía.
        </p>

        <div className="mt-6">
          <CopyEmailsButton emails={emails} />
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-brand-muted">
              <th className="px-4 py-3 font-semibold">Producto</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-black/5 last:border-0 hover:bg-brand-soft/50">
                <td className="px-4 py-3 font-medium text-brand-ink">{e.productName}</td>
                <td className="px-4 py-3 text-brand-muted">{e.categoryName ?? "—"}</td>
                <td className="px-4 py-3">
                  <p className="text-brand-ink">{e.name}</p>
                  <p className="text-xs text-brand-muted">
                    {e.email}
                    {e.phone ? ` · ${e.phone}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-brand-muted">{e.createdAt.toLocaleDateString("es-AR")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    {e.phone && isLikelyPhone(e.phone) && (
                      <a
                        href={buildWhatsAppLink(
                          e.phone,
                          `Hola ${e.name}! Te escribimos de ${storeNameOf(settings)} porque estabas esperando que vuelva el stock de "${e.productName}" — ¡ya está disponible!`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Escribir por WhatsApp"
                        className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
                        WhatsApp
                      </a>
                    )}
                    <form action={deleteWaitlistEntry.bind(null, e.id)}>
                      <button
                        type="submit"
                        className="cursor-pointer text-xs font-medium text-brand-muted hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay nadie anotado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

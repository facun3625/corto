import { prisma } from "@/lib/prisma";
import { hasRunningJob } from "@/lib/woo/jobs";
import { countPendingActivation } from "./actions";
import { MigrationWizard } from "./MigrationWizard";

export const dynamic = "force-dynamic";

export default async function MigracionPage() {
  const [latest, pendingActivation] = await Promise.all([
    prisma.migrationJob.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, status: true, sourceUrl: true } }),
    countPendingActivation(),
  ]);
  return (
    <div className="max-w-3xl pb-16">
      <h1 className="text-2xl font-bold text-brand-ink">Migrar desde WooCommerce</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Trae por única vez el catálogo de una tienda WooCommerce: categorías, atributos, productos simples y variables
        (con variantes e imágenes) y, si querés, los clientes. No se migran pedidos, cupones ni reseñas. Si se corta o
        querés repetirla, podés volver a ejecutarla: no se duplica nada.
      </p>
      <MigrationWizard
        activeJobId={latest && (latest.status === "running" || hasRunningJob()) ? latest.id : null}
        lastJob={latest ? { id: latest.id, sourceUrl: latest.sourceUrl } : null}
        pendingActivation={pendingActivation}
      />
    </div>
  );
}

import { getVisitStats, type Granularity } from "@/lib/visits";
import { StatCard } from "@/components/admin/StatCard";
import { EyeIcon, DashboardIcon, TrendUpIcon } from "@/components/icons";
import { VisitFilters, PERIODS, type PeriodKey } from "./VisitFilters";

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/tienda": "Tienda",
  "/carrito": "Carrito",
  "/login": "Login",
  "/registro": "Registro",
};

function pageLabel(path: string): string {
  return PAGE_LABELS[path] ?? path;
}

function periodToRange(period: PeriodKey): { from?: Date; granularity: Granularity } {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), granularity: "hour" };
    case "7d":
      return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), granularity: "day" };
    case "30d":
      return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), granularity: "day" };
    case "12m":
      return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), granularity: "month" };
    case "all":
      return { granularity: "month" };
  }
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function AdminVisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  // Rango libre (from/to en la URL) tiene prioridad sobre el atajo rápido —
  // así se puede elegir cualquier período, no solo los 4 fijos (incluye
  // "hoy" con from=to=misma fecha).
  const customFrom = parseDateInput(params.from);
  const customTo = parseDateInput(params.to);
  const isCustom = Boolean(customFrom && customTo);
  const period: PeriodKey = params.period && params.period in PERIODS ? (params.period as PeriodKey) : "30d";

  let from: Date | undefined;
  let to: Date | undefined;
  let granularity: Granularity;
  let rangeLabel: string;

  if (isCustom && customFrom && customTo) {
    from = new Date(customFrom.getFullYear(), customFrom.getMonth(), customFrom.getDate());
    to = new Date(customTo.getFullYear(), customTo.getMonth(), customTo.getDate(), 23, 59, 59, 999);
    const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    granularity = spanDays <= 1 ? "hour" : spanDays <= 62 ? "day" : "month";
    const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    rangeLabel = customFrom.toDateString() === customTo.toDateString() ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
  } else {
    ({ from, granularity } = periodToRange(period));
    rangeLabel = PERIODS[period];
  }

  const stats = await getVisitStats({ from, to, granularity });

  const maxSeries = Math.max(1, ...stats.series.map((m) => m.count));
  const maxPage = Math.max(1, ...stats.topPages.map((p) => p.count));
  const maxProduct = Math.max(1, ...stats.topCartProducts.map((p) => p.quantity));
  const labelStep = Math.max(1, Math.ceil(stats.series.length / 10));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-brand-ink">Visitas</h1>
        <p className="mt-1 text-sm text-brand-muted">Tráfico del sitio online — no confundir con Estadísticas, que es de ventas.</p>
        <VisitFilters
          period={period}
          from={customFrom ? toDateInputValue(customFrom) : ""}
          to={customTo ? toDateInputValue(customTo) : ""}
          isCustom={isCustom}
        />
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={EyeIcon} tone="pink" label="Visitas" value={String(stats.visits)} hint="sesiones distintas en el período" />
        <StatCard
          icon={DashboardIcon}
          tone="neutral"
          label="Vistas de página"
          value={String(stats.pageViews)}
          hint="incluye recargas y navegación"
        />
        <StatCard
          icon={TrendUpIcon}
          tone="green"
          label="Páginas por visita"
          value={stats.visits > 0 ? (stats.pageViews / stats.visits).toFixed(1) : "0"}
          hint="promedio"
        />
      </div>

      {/* Visitas en el tiempo */}
      <div className="mt-4 rounded-xl border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold text-brand-ink">Vistas de página</p>
        <p className="text-xs text-brand-muted">{rangeLabel}.</p>
        {stats.series.length === 0 || stats.pageViews === 0 ? (
          <p className="mt-8 text-center text-sm text-brand-muted">Sin visitas registradas en este período.</p>
        ) : (
          <div className="mt-4 flex h-48 gap-1">
            {stats.series.map((m, i) => (
              <div key={`${m.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-full w-full flex-1 items-end">
                  <div className="absolute inset-0 rounded-t bg-black/[0.03]" />
                  <div
                    className="relative w-full rounded-t bg-brand-pink/80 transition-all hover:bg-brand-pink"
                    style={{ height: `${Math.max(m.count > 0 ? 2 : 0, (m.count / maxSeries) * 100)}%` }}
                    title={`${m.label}: ${m.count} vistas`}
                  />
                </div>
                <span className="text-[10px] text-brand-muted">
                  {i % labelStep === 0 || i === stats.series.length - 1 ? m.label : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Páginas más vistas */}
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold text-brand-ink">Páginas más vistas</p>
          {stats.topPages.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">Sin visitas registradas en este período.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {stats.topPages.map((p) => (
                <div key={p.path}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-brand-ink">{pageLabel(p.path)}</span>
                    <span className="shrink-0 font-semibold text-brand-ink">{p.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-brand-soft">
                    <div className="h-1.5 rounded-full bg-brand-pink" style={{ width: `${(p.count / maxPage) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productos más agregados al carrito */}
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold text-brand-ink">Productos más agregados al carrito</p>
          <p className="mt-0.5 text-xs text-brand-muted">Suma carritos en curso + pedidos hechos — no es lo mismo que "más vendidos".</p>
          {stats.topCartProducts.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">Sin datos en este período.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {stats.topCartProducts.map((p) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-brand-ink">{p.name}</span>
                    <span className="shrink-0 font-semibold text-brand-ink">{p.quantity} u.</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-brand-soft">
                    <div
                      className="h-1.5 rounded-full bg-brand-pink"
                      style={{ width: `${(p.quantity / maxProduct) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

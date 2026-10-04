import { TagIcon, TruckIcon, StoreIcon, getBenefitIcon } from "@/components/icons";
import type { SiteSettings } from "@/lib/settings";

type Benefit = { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; subtitle: string };

// Franja de 3 beneficios debajo del hero. Los valores por defecto se arman
// acá a partir de datos reales de la tienda (descuento en efectivo, zona de
// envío, dirección) para no quedar desactualizados si cambian — pero cada
// uno se puede pisar por completo (ícono/título/subtítulo) desde
// /admin/configuracion, ver `overrides`.
export function BenefitsStrip({
  cashDiscountPct,
  franchiseLocation,
  address,
  overrides,
}: {
  cashDiscountPct: number | null;
  franchiseLocation: string;
  address: string;
  overrides: SiteSettings["benefits"];
}) {
  const defaults: Benefit[] = [
    cashDiscountPct
      ? { icon: TagIcon, title: `${cashDiscountPct}% OFF pagando en efectivo`, subtitle: "En toda la tienda" }
      : { icon: TagIcon, title: "Múltiples medios de pago", subtitle: "Efectivo, transferencia y tarjeta" },
    { icon: TruckIcon, title: `Envíos a ${franchiseLocation}`, subtitle: "Rápidos y seguros" },
    { icon: StoreIcon, title: "Retiro en local", subtitle: address },
  ];

  const benefits: Benefit[] = defaults.map((def, i) => {
    const o = overrides[i];
    return {
      icon: o?.icon ? getBenefitIcon(o.icon) : def.icon,
      title: o?.title?.trim() || def.title,
      subtitle: o?.subtitle?.trim() || def.subtitle,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-3 rounded-b-3xl border-x border-b border-black/5 bg-white px-4 py-5 shadow-sm sm:grid-cols-3 sm:px-6">
      {benefits.map((b, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-pink-dark shadow-sm">
            <b.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-ink">{b.title}</p>
            <p className="truncate text-xs text-brand-muted">{b.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

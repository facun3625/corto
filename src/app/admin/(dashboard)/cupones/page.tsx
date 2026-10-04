import { prisma } from "@/lib/prisma";
import { getAllCategories } from "@/lib/categories";
import { SectionSidebar } from "@/components/admin/SectionSidebar";
import { WhatsAppIcon, TagIcon, PlusIcon } from "@/components/icons";
import { createCoupon, updateCoupon } from "./actions";
import { CouponFields } from "./CouponFields";
import { QuickCouponGenerator } from "./QuickCouponGenerator";

export default async function AdminCuponesPage() {
  const [coupons, categories] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    getAllCategories(),
  ]);

  // --- Tab: Cupones activos (la lista de siempre) ---
  const listPanel = (
    <div className="flex flex-col gap-4">
      {coupons.map((coupon) => (
        <form
          key={coupon.id}
          action={updateCoupon}
          className={`rounded-xl border bg-white p-5 transition-colors ${
            coupon.enabled ? "border-brand-pink/30" : "border-black/10"
          }`}
        >
          <input type="hidden" name="id" value={coupon.id} />
          <CouponFields defaults={coupon} categories={categories} submitLabel="Guardar" couponId={coupon.id} />
        </form>
      ))}

      {coupons.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/15 bg-white p-5 text-center text-sm text-brand-muted">
          Todavía no creaste ningún cupón.
        </p>
      )}
    </div>
  );

  // --- Tab: Nuevo cupón (con condiciones, el form completo) ---
  const newPanel = (
    <form action={createCoupon} className="rounded-xl border border-dashed border-black/20 bg-white p-5">
      <p className="mb-4 font-semibold text-brand-ink">Nuevo cupón</p>
      <CouponFields defaults={null} categories={categories} submitLabel="Crear" />
    </form>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-brand-ink">Cupones</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Creá códigos de descuento. Todas las condiciones son opcionales: si no cargás ninguna, el cupón aplica a
          cualquier compra.
        </p>
      </div>

      <SectionSidebar
        tabs={[
          { id: "rapido", label: "Cupón rápido", icon: <WhatsAppIcon className="h-4 w-4 shrink-0" />, content: <QuickCouponGenerator /> },
          {
            id: "activos",
            label: "Cupones activos",
            icon: <TagIcon className="h-4 w-4 shrink-0" />,
            badge: coupons.length > 0 ? String(coupons.length) : undefined,
            content: listPanel,
          },
          { id: "nuevo", label: "Nuevo cupón", icon: <PlusIcon className="h-4 w-4 shrink-0" />, content: newPanel },
        ]}
      />
    </div>
  );
}

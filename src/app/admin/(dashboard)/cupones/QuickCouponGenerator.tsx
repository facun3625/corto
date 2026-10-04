"use client";

import { useActionState, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { buildWhatsAppLink, isLikelyPhone } from "@/lib/whatsapp";
import { generateQuickCoupon, type QuickCouponResult } from "./actions";

const fieldClasses =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-brand-ink focus:border-brand-pink focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-brand-muted";

// Para cuando alguien compra en el local físico y se lo quiere invitar a
// probar la tienda online: genera un cupón de un solo uso con el % que
// cargues, y arma al toque el link de WhatsApp para mandárselo — el
// teléfono no se guarda en ningún lado, solo se usa acá para armar el link.
export function QuickCouponGenerator() {
  const [state, formAction, pending] = useActionState<QuickCouponResult | null, FormData>(
    async (_prev, formData) => generateQuickCoupon(formData),
    null
  );
  const [phone, setPhone] = useState("");

  // Este bloque solo se renderiza después de generar el cupón (interacción
  // del admin, nunca en el render inicial/SSR) — usar window acá directo no
  // genera mismatch de hidratación.
  const whatsappUrl =
    state?.ok && isLikelyPhone(phone)
      ? buildWhatsAppLink(
          phone,
          [
            `¡Hola! Te dejamos un cupón para que pruebes nuestra tienda online 🛍️`,
            `${state.discountValue}% OFF con el código ${state.code}`,
            state.expiresAt
              ? `Válido hasta el ${new Date(state.expiresAt).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}.`
              : null,
            `Lo ingresás al pagar, en ${typeof window !== "undefined" ? window.location.origin : ""}/tienda`,
          ]
            .filter(Boolean)
            .join("\n")
        )
      : null;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <p className="font-semibold text-brand-ink">Cupón rápido para cliente del local</p>
      <p className="mt-1 text-xs text-brand-muted">
        Para alguien que compró en el local y querés invitar a probar la tienda online: un cupón de un solo uso, sin
        más condiciones.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <label className={labelClasses}>Descuento (%)</label>
          <input type="number" name="discountValue" min={1} max={100} defaultValue={15} required className={fieldClasses} />
        </div>
        <div className="w-36">
          <label className={labelClasses}>Vence en (días)</label>
          <input type="number" name="expiresInDays" min={0} defaultValue={30} className={fieldClasses} />
          <p className="mt-1 text-[11px] text-brand-muted">0 = sin vencimiento</p>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className={labelClasses}>WhatsApp del cliente (opcional)</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5493420000000"
            className={fieldClasses}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Generando..." : "Generar cupón"}
        </button>
      </form>

      {state && !state.ok && <p className="mt-3 text-sm font-medium text-red-600">{state.error}</p>}

      {state?.ok && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand-pink/20 bg-brand-soft px-4 py-3">
          <div>
            <p className="text-xs text-brand-muted">Cupón generado</p>
            <p className="font-mono text-lg font-bold tracking-wide text-brand-ink">{state.code}</p>
          </div>
          <span className="text-sm text-brand-muted">{state.discountValue}% OFF, un solo uso</span>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" />
              Enviar por WhatsApp
            </a>
          ) : (
            <p className="ml-auto text-xs text-brand-muted">Cargá un WhatsApp arriba para mandárselo directo.</p>
          )}
        </div>
      )}
    </div>
  );
}

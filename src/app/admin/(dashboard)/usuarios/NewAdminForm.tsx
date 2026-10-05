"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon } from "@/components/icons";
import { createAdminUser } from "./actions";

const field = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-brand-ink focus:border-brand-pink focus:outline-none";
const label = "mb-1 block text-xs font-medium text-brand-muted";

// Alta de un administrador de la tienda (con su email y una contraseña inicial)
export function NewAdminForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await createAdminUser(form);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setForm({ name: "", email: "", password: "" });
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="cursor-pointer rounded-lg bg-brand-pink px-3 py-2 text-xs font-semibold text-white hover:bg-brand-pink-dark">
        + Nuevo administrador
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-base font-bold text-brand-ink">Nuevo administrador</h3>
        <p className="mt-1 text-sm text-brand-muted">Va a poder entrar al panel de la tienda con su email y esta contraseña (la puede cambiar con “Olvidé mi contraseña”). Si el email ya tiene una cuenta, esa cuenta pasa a ser administradora.</p>
        <div className="mt-4 flex flex-col gap-3">
          <div><label className={label}>Nombre</label><input className={field} value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className={label}>Email</label><input type="email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" /></div>
          <div>
            <label className={label}>Contraseña inicial (mínimo 8 caracteres)</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className={`${field} pr-11`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-brand-muted hover:bg-brand-soft hover:text-brand-ink"
              >
                {showPassword ? (
                  // ojo tachado
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4 9.5 7a11 11 0 0 1-2.6 3.9M6.6 6.7A11 11 0 0 0 2.5 12c1 3 4.5 7 9.5 7a9.7 9.7 0 0 0 4-.9" /></svg>
                ) : (
                  <EyeIcon className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>
        </div>
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-soft">Cerrar</button>
          <button type="button" disabled={pending || !form.email.trim()} onClick={submit} className="cursor-pointer rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50">
            {pending ? "Creando…" : "Crear administrador"}
          </button>
        </div>
      </div>
    </div>
  );
}

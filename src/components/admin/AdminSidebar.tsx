"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, PackageIcon, SalesIcon, UsersIcon, StoreIcon, UserIcon, CardIcon, TruckIcon, TagIcon, MailIcon, CartIcon, StarIcon, GearIcon, BellIcon, BellRingIcon, SendIcon, HomeIcon, ClipboardIcon, TrendUpIcon, EyeIcon } from "@/components/icons";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const LINKS = [
  { href: "/admin/inicio", keywords: "panel resumen tablero alertas", label: "Inicio", icon: HomeIcon },
  { href: "/admin/productos", keywords: "articulos stock precios variantes importar exportar catalogo", label: "Productos", icon: PackageIcon },
  { href: "/admin/categorias", keywords: "rubros arbol", label: "Categorías", icon: TagIcon },
  { href: "/admin/atributos", keywords: "talles colores variantes", label: "Atributos", icon: ClipboardIcon },
  { href: "/admin/migracion", keywords: "woocommerce woo importar traer", label: "Migración Woo", icon: SendIcon },
  { href: "/admin/ventas", keywords: "pedidos ordenes compras ventas rotulo oca seguimiento", label: "Ventas", icon: SalesIcon },
  { href: "/admin/estadisticas", keywords: "reportes informes ingresos metricas", label: "Estadísticas", icon: TrendUpIcon },
  { href: "/admin/visitas", keywords: "trafico analytics", label: "Visitas", icon: EyeIcon },
  { href: "/admin/carritos-abandonados", keywords: "carrito recuperar", label: "Carritos abandonados", icon: CartIcon },
  { href: "/admin/lista-espera", keywords: "avisame stock espera", label: "Lista de espera", icon: BellIcon },
  { href: "/admin/mailing", keywords: "campanas email correos masivos", label: "Mailing", icon: SendIcon },
  { href: "/admin/notificaciones", keywords: "push avisos", label: "Notificaciones", icon: BellRingIcon },
  { href: "/admin/pagos", keywords: "mercado pago transferencia tarjeta payway efectivo descuento medios", label: "Pagos", icon: CardIcon },
  { href: "/admin/envios", keywords: "oca correo envio gratis zonas codigo postal acordar retiro domicilio", label: "Envíos", icon: TruckIcon },
  { href: "/admin/cupones", keywords: "descuentos codigos promociones", label: "Cupones", icon: TagIcon },
  { href: "/admin/temas", keywords: "campanas slider banner portada colores navidad tipografia anuncio aspecto tarjetas", label: "Temas y campañas", icon: StarIcon },
  { href: "/admin/paginas", keywords: "legales terminos politicas quienes somos", label: "Páginas", icon: ClipboardIcon },
  { href: "/admin/mensajes", keywords: "consultas contacto formulario", label: "Mensajes", icon: MailIcon },
  { href: "/admin/contacto", keywords: "sucursales datos telefono whatsapp instagram direccion tarjetas mapa", label: "Contacto", icon: MailIcon },
  { href: "/admin/puntos", keywords: "recompensas fidelizacion", label: "Puntos", icon: StarIcon },
  { href: "/admin/usuarios", keywords: "clientes cuentas usuarios", label: "Clientes", icon: UsersIcon },
  { href: "/admin/segmentos", keywords: "grupos clientes", label: "Segmentos", icon: TagIcon },
  { href: "/admin/suscriptores", keywords: "newsletter email", label: "Suscriptores", icon: MailIcon },
  { href: "/admin/logs", keywords: "historial auditoria actividad", label: "Registro", icon: ClipboardIcon },
  { href: "/admin/configuracion", keywords: "logo favicon correo smtp resend ia vendedora telegram moneda mantenimiento popup pie", label: "Configuración", icon: GearIcon },
];

// Sin tildes ni mayúsculas, para que "configuracion" encuentre "Configuración"
const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function AdminSidebar({ userLabel, logoUrl = "/logo2.png", counts }: { userLabel: string; logoUrl?: string; counts?: { pendingOrders: number; unreadMessages: number } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Buscador predictivo del menú: filtra por el nombre de la sección y por palabras relacionadas (ej. "pedidos" → Ventas)
  const matches = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return LINKS.filter((l) => {
      const hay = norm(`${l.label} ${l.keywords}`);
      return terms.every((t) => hay.includes(t));
    }).sort((a, b) => Number(norm(b.label).startsWith(norm(query))) - Number(norm(a.label).startsWith(norm(query))));
  }, [query]);

  // Ctrl/Cmd + K enfoca el buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setQuery("");
    setOpen(false);
    router.push(href);
  }

  const searching = query.trim().length > 0;
  const list = searching ? matches : LINKS;

  return (
    <aside className="relative z-50 flex w-full shrink-0 flex-col border-b border-black/5 bg-white px-3 py-2 md:h-full md:w-56 md:border-0 md:border-r md:border-black/10 md:bg-white md:py-3">
      <div className="flex min-h-11 shrink-0 items-center justify-between px-1 md:mb-2.5 md:justify-center md:px-3 md:py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="Logo de la tienda" className="h-9 w-auto md:h-8" />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Cerrar menú del panel" : "Abrir menú del panel"}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-ink hover:bg-brand-soft md:hidden"
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full max-h-[calc(100dvh-3.75rem)] flex-col border-b border-black/10 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl md:static md:flex md:min-h-0 md:flex-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        <div className="relative shrink-0 py-2 md:pb-2 md:pt-0">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted md:top-[calc(50%-0.25rem)]" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter" && matches[highlight]) {
                e.preventDefault();
                go(matches[highlight].href);
              } else if (e.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder="Buscar en el panel…  (Ctrl K)"
            aria-label="Buscar una sección del panel"
            className="w-full rounded-lg border border-black/10 bg-white py-2 pl-8 pr-2 text-xs text-brand-ink placeholder:text-brand-muted focus:border-brand-pink focus:outline-none md:bg-black/[0.03] md:py-1.5"
          />
        </div>

        <nav className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-px overflow-y-auto pb-2 md:pb-0">
        {searching && matches.length === 0 && <p className="px-3 py-2 text-xs text-brand-muted md:px-2">Sin resultados para “{query}”.</p>}
        {list.map((link, index) => {
          const active = pathname.startsWith(link.href);
          const picked = searching && index === highlight;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:min-h-0 md:px-2 md:py-1.5 md:text-[12px] ${
                picked
                  ? "bg-brand-pink/10 text-brand-pink-dark ring-1 ring-brand-pink"
                  : active
                  ? "bg-brand-pink/10 text-brand-pink-dark md:bg-brand-pink md:text-white"
                  : "text-brand-ink/80 hover:bg-black/[0.04] hover:text-brand-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 md:h-3 md:w-3" />
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              {(() => {
                // Números a la derecha: pedidos pendientes en Ventas y mensajes sin leer en Mensajes
                const n = link.href === "/admin/ventas" ? counts?.pendingOrders : link.href === "/admin/mensajes" ? counts?.unreadMessages : 0;
                return n ? (
                  <span className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white text-brand-pink-dark" : "bg-brand-pink text-white"}`}>{n > 99 ? "99+" : n}</span>
                ) : null;
              })()}
            </Link>
          );
        })}
        </nav>

        <div className="mt-1.5 flex shrink-0 flex-col gap-px border-t border-black/5 pt-1.5">
        <p className="flex items-center gap-2 px-2 py-1 text-xs text-brand-ink/80">
          <UserIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{userLabel}</span>
        </p>
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-brand-ink/80 transition-colors hover:bg-black/[0.04] hover:text-brand-ink"
        >
          <StoreIcon className="h-3.5 w-3.5 shrink-0" />
          Volver al sitio
        </Link>
        <AdminLogoutButton />
        </div>
      </div>
    </aside>
  );
}

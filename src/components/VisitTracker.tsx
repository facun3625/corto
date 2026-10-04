"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getCartSessionId } from "@/lib/cartSession";

// Manda una vista de página por cada cambio de ruta del sitio público. Vive
// aparte de SiteChrome (que decide cuándo montarlo — nunca en /admin) para
// no mezclar tracking con el layout. Reusa el mismo sessionId anónimo que ya
// usa el carrito, así "visitas" se puede calcular como sesiones distintas
// sin inventar un segundo mecanismo de sesión.
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const sessionId = getCartSessionId();
    if (!sessionId) return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, sessionId }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}

// Se ejecuta una única vez cuando arranca el server. Lo usamos para acreditar
// periódicamente los puntos de los pedidos ya entregados (cada 15 minutos).
// También se acreditan al marcar un pedido como entregado y hay un botón
// manual en /admin/puntos que llama a la misma función.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { syncDeliveredOrders } = await import("@/lib/points");
  const INTERVAL_MS = 15 * 60 * 1000;

  const run = () => {
    syncDeliveredOrders().catch((err: unknown) => console.error("syncDeliveredOrders (auto) failed", err));
  };

  setTimeout(run, 30_000);
  setInterval(run, INTERVAL_MS);
}

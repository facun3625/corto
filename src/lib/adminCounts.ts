import { prisma } from "@/lib/prisma";

// Números que se ven en el menú y en la campanita del panel (consultas baratas: solo conteos)
// showMessages: la sección Mensajes solo se muestra si hay algo que ver: mensajes guardados o una página pública con el
// formulario de contacto activo (si no existe ningún formulario, esa bandeja nunca se llenaría).
export type AdminCounts = { pendingOrders: number; staleOrders: number; unreadMessages: number; showMessages: boolean };

export async function getAdminCounts(): Promise<AdminCounts> {
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const [pendingOrders, staleOrders, unreadMessages, totalMessages, activeForms] = await Promise.all([
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "pending", createdAt: { lt: dayAgo } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.contactMessage.count(),
    prisma.page.count({ where: { enabled: true, showContactForm: true } }),
  ]);
  return { pendingOrders, staleOrders, unreadMessages, showMessages: totalMessages > 0 || activeForms > 0 };
}

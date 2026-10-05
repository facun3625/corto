import { prisma } from "@/lib/prisma";

// Números que se ven en el menú y en la campanita del panel (consultas baratas: solo conteos)
export type AdminCounts = { pendingOrders: number; staleOrders: number; unreadMessages: number };

export async function getAdminCounts(): Promise<AdminCounts> {
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const [pendingOrders, staleOrders, unreadMessages] = await Promise.all([
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "pending", createdAt: { lt: dayAgo } } }),
    prisma.contactMessage.count({ where: { read: false } }),
  ]);
  return { pendingOrders, staleOrders, unreadMessages };
}

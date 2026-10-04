"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function deleteAbandonedCart(id: string) {
  await requireAdmin();
  await prisma.abandonedCart.delete({ where: { id } });
  revalidatePath("/admin/carritos-abandonados");
}

// Sin cron todavía — botón manual para limpiar lo que quedó viejo (+30 días
// sin actividad, casi seguro que ya no sirve para contactar a nadie).
export async function cleanupOldAbandonedCarts() {
  await requireAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.abandonedCart.deleteMany({ where: { lastActive: { lt: cutoff } } });
  revalidatePath("/admin/carritos-abandonados");
}

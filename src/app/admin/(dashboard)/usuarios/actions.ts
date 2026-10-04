"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { logAdminAction } from "@/lib/adminLog";

export async function setUserRole(id: string, role: "admin" | "customer") {
  const session = await requireAdmin();
  // Un admin no puede sacarse el rol a sí mismo desde acá — evita quedarse
  // afuera del panel por error si es el único admin.
  if (session.user.id === id && role !== "admin") {
    throw new Error("No podés quitarte el rol de administrador a vos mismo.");
  }
  // La cuenta del superadministrador no se toca desde el panel (solo se define en la base de datos)
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target || target.role === "superadmin") throw new Error("No autorizado");
  await prisma.user.update({ where: { id }, data: { role } });
  await logAdminAction(role === "admin" ? "user.make_admin" : "user.remove_admin", { targetType: "user", targetId: id, detail: target.email });
  revalidatePath("/admin/usuarios");
}

export type NewAdminInput = { name: string; email: string; password: string };

// Un administrador (o el superadministrador) puede crear otros administradores de la tienda. Si el email ya tiene cuenta, esa
// cuenta pasa a ser administrador y conserva su contraseña (o su ingreso con Google).
export async function createAdminUser(input: NewAdminInput): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 80) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "El email no es válido." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    if (existing.role === "superadmin") return { ok: false, message: "Ese email no se puede usar." };
    if (existing.role === "admin") return { ok: false, message: "Esa persona ya es administradora." };
    await prisma.user.update({ where: { id: existing.id }, data: { role: "admin" } });
    await logAdminAction("user.make_admin", { targetType: "user", targetId: existing.id, detail: email });
    revalidatePath("/admin/usuarios");
    return { ok: true, message: `${email} ya tenía una cuenta: ahora es administrador (entra con su misma clave o con Google).` };
  }
  if (input.password.length < 8) return { ok: false, message: "La contraseña tiene que tener al menos 8 caracteres." };
  const created = await prisma.user.create({ data: { email, name, role: "admin", passwordHash: await bcrypt.hash(input.password, 10) }, select: { id: true } });
  await logAdminAction("user.create_admin", { targetType: "user", targetId: created.id, detail: email });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: `Administrador creado. Puede entrar con ${email} y la contraseña que cargaste.` };
}

// El delete es en cascada por el schema, no hace falta borrar nada a mano acá:
// sus puntos y cupones canjeados (PointTransaction, Coupon.user) se borran con
// onDelete: Cascade; sus pedidos y carritos abandonados quedan (userId pasa a
// null vía onDelete: SetNull), son registros propios de la tienda.
export async function deleteUser(id: string) {
  const session = await requireAdmin();
  if (session.user.id === id) {
    throw new Error("No podés eliminar tu propia cuenta.");
  }
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target || target.role === "superadmin") throw new Error("No autorizado");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}

// Ajuste manual del saldo de puntos de un cliente (con motivo, queda en su historial)
export async function adjustUserPoints(userId: string, delta: number, reason: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) return { ok: false, error: "Ingresá una cantidad de puntos entera distinta de 0" };
  const text = reason.trim().slice(0, 200);
  if (!text) return { ok: false, error: "Indicá el motivo del ajuste" };
  const adminName = session.user?.name ?? session.user?.email ?? "Admin";
  try {
    await prisma.$transaction(async (tx) => {
      // La condición evita que el saldo quede negativo si dos ajustes se pisan
      const { count } = await tx.user.updateMany({
        where: { id: userId, ...(delta < 0 ? { points: { gte: -delta } } : {}) },
        data: { points: { increment: delta } },
      });
      if (count === 0) throw new Error("NO_BALANCE");
      await tx.pointTransaction.create({ data: { userId, amount: delta, description: `Ajuste manual (${adminName}): ${text}` } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_BALANCE") return { ok: false, error: "El cliente no tiene puntos suficientes para ese descuento" };
    throw err;
  }
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

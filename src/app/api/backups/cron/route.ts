import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { backupSecret, createBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

// Lo llama el cron del servidor (scripts/run-backup.sh) una vez por noche. Se autoriza con
// "Authorization: Bearer <BACKUP_SECRET>"; sin ese secreto configurado, queda desactivado.
export async function POST(req: Request) {
  const secret = backupSecret();
  if (!secret) return NextResponse.json({ error: "Copias desactivadas: falta BACKUP_SECRET" }, { status: 503 });

  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const r = await createBackup("auto");
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    console.error("backup automático falló", err);
    return NextResponse.json({ error: "No se pudo crear la copia" }, { status: 500 });
  }
}

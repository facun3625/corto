import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { isValidBackupName, readBackupPlain } from "@/lib/backup";

export const dynamic = "force-dynamic";

// Descarga una copia ya descifrada (.json.gz). Solo el superadministrador.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { name } = await params;
  if (!isValidBackupName(name)) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  try {
    const plain = await readBackupPlain(name);
    return new NextResponse(new Uint8Array(plain), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${name.replace(/\.cpbk$/, ".json.gz")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("descarga de backup falló", err);
    return NextResponse.json({ error: "No se pudo leer la copia" }, { status: 500 });
  }
}

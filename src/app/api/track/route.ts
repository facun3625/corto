import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TrackBody = { path?: string; sessionId?: string };

// Registro de visitas del sitio público — nunca debe romper la navegación
// del cliente si falla, por eso siempre contesta 200 y no hace ninguna
// validación estricta más allá de chequear que vinieron los dos campos.
export async function POST(req: Request) {
  try {
    const { path, sessionId } = (await req.json()) as TrackBody;
    if (!path || !sessionId) return NextResponse.json({ ok: true });

    await prisma.pageView.create({
      data: { path: path.slice(0, 200), sessionId: sessionId.slice(0, 100) },
    });
  } catch (err) {
    console.error("POST /api/track failed", err);
  }
  return NextResponse.json({ ok: true });
}

import { readFile } from "node:fs/promises";
import path from "node:path";

// Manual de uso del panel de administración — HTML autocontenido (con las
// capturas embebidas en base64) generado aparte, no una página React común.
// A propósito SIN login: se comparte también con franquicias potenciales
// como material de venta/onboarding, no solo referencia interna. El link no
// está listado en ningún menú del sitio y lleva noindex — no es secreto por
// contraseña, es "no lo vas a encontrar salvo que te pasen el link".
const MANUAL_PATH = path.join(process.cwd(), "src", "content", "moda-manual.html");

export async function GET() {
  const html = await readFile(MANUAL_PATH, "utf-8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

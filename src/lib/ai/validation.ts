const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAssistantSessionId(value: unknown): string {
  if (typeof value !== "string" || !SESSION_ID_RE.test(value)) {
    throw new Error("Sesión inválida");
  }
  return value;
}

export function parseAssistantRequest(value: unknown): { sessionId: string; message: string } {
  if (!value || typeof value !== "object") throw new Error("Solicitud inválida");
  const { sessionId, message } = value as Record<string, unknown>;
  const validSessionId = parseAssistantSessionId(sessionId);
  if (typeof message !== "string") throw new Error("Mensaje inválido");
  const normalized = message.trim().replace(/\s{3,}/g, "  ");
  if (!normalized) throw new Error("Escribí un mensaje");
  if (normalized.length > 600) throw new Error("El mensaje es demasiado largo");
  return { sessionId: validSessionId, message: normalized };
}

export function safeToolArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function optionalNumber(value: unknown, min = 0): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min ? value : undefined;
}

export function optionalText(value: unknown, maxLength = 100): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, maxLength);
  return text || undefined;
}

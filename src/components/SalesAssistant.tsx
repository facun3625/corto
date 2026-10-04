"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCart } from "@/lib/cart";
import type { SiteSettings } from "@/lib/settings";
import type { AssistantProduct } from "@/lib/ai/types";
import { WhatsAppIcon } from "@/components/icons";

type AssistantSettings = SiteSettings["assistant"];
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: AssistantProduct[];
};

const SESSION_KEY = "cortopassi_ai_session";
const MESSAGES_KEY = "cortopassi_ai_messages";

function sessionId(): string {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const created = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

function money(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function textOnly(messages: ChatMessage[]) {
  return messages.slice(-20).map(({ id, role, content }) => ({ id, role, content }));
}

export function SalesAssistant({ settings }: { settings: AssistantSettings }) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [liveSettings, setLiveSettings] = useState(settings);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: settings.welcomeMessage },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(MESSAGES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as unknown;
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (message): message is ChatMessage =>
                Boolean(message)
                && typeof message === "object"
                && typeof message.id === "string"
                && (message.role === "user" || message.role === "assistant")
                && typeof message.content === "string",
            );
            if (valid.length > 0) setMessages(valid.slice(-20));
          }
        }
      } catch {
        localStorage.removeItem(MESSAGES_KEY);
      } finally {
        setHistoryLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(textOnly(messages)));
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [historyLoaded, messages, sending]);

  useEffect(() => {
    let active = true;
    const refreshStatus = () => {
      fetch("/api/assistant/status", { cache: "no-store" })
        .then(async (response) => {
          if (active && response.ok) setLiveSettings(await response.json() as AssistantSettings);
        })
        .catch(() => {});
    };
    refreshStatus();
    const interval = window.setInterval(refreshStatus, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setError(null);
    setSending(true);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content }]);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId(), message: content }),
      });
      const result = await response.json() as {
        message?: string;
        products?: AssistantProduct[];
        error?: string;
      };
      if (!response.ok || !result.message) throw new Error(result.error || "No pude responder ahora.");
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message as string,
          products: result.products,
        },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pude responder ahora.");
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    const previousSessionId = sessionId();
    localStorage.setItem(SESSION_KEY, crypto.randomUUID());
    localStorage.removeItem(MESSAGES_KEY);
    setMessages([{ id: "welcome", role: "assistant", content: liveSettings.welcomeMessage }]);
    setInput("");
    setError(null);
    fetch("/api/assistant/chat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: previousSessionId }),
    }).catch(() => {});
  }

  if (!liveSettings.enabled) {
    if (!liveSettings.humanSeller.enabled) return null;
    const commonClasses =
      "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-50 flex h-12 items-center gap-1.5 rounded-full px-3.5 text-white shadow-lg sm:right-5";

    if (liveSettings.humanSeller.available && liveSettings.humanSeller.whatsappUrl) {
      return (
        <a
          href={liveSettings.humanSeller.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className={`${commonClasses} bg-[#25D366] transition-transform hover:scale-105`}
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">Escribinos</span>
        </a>
      );
    }

    return (
      <div
        title={`Atención por WhatsApp: ${liveSettings.humanSeller.scheduleText}`}
        className={`${commonClasses} cursor-default bg-[#25D366]/55`}
      >
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        <span className="text-xs font-semibold">Fuera de horario</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-50 sm:right-5">
      {open && (
        <section
          role="dialog"
          aria-label={liveSettings.name}
          className="absolute bottom-14 right-0 flex h-[min(560px,calc(100dvh-6.5rem))] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
        >
          <header className="flex min-h-14 items-center justify-between gap-1.5 bg-brand-pink px-3 py-2.5 text-white sm:px-4 sm:py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold sm:text-base">{liveSettings.name}</p>
              <p className="hidden truncate text-xs text-white/85 min-[350px]:block">Te ayudo a encontrar lo que buscás</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={clearChat}
                disabled={sending}
                title="Borrar la conversación y empezar de nuevo"
                aria-label="Limpiar chat"
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-2.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:border-white/60 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                </svg>
                <span className="hidden min-[350px]:inline">Limpiar</span>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar asistente"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-2xl leading-none hover:bg-white/15"
              >
                ×
              </button>
            </div>
          </header>

          <div className="flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain bg-brand-soft/35 p-2.5 sm:p-3" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-6 sm:ml-9" : "mr-3 sm:mr-5"}>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-sm bg-brand-pink text-white"
                      : "rounded-bl-sm border border-black/5 bg-white text-brand-ink shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
                {message.products && message.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.products.map((product) => (
                      <article key={product.id} className="flex gap-2.5 rounded-xl border border-black/10 bg-white p-2 shadow-sm">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`data:image/png;base64,${product.image}`}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-brand-soft" />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link href={product.href} className="line-clamp-2 text-xs font-semibold text-brand-ink hover:underline">
                            {product.name}
                          </Link>
                          <p className="mt-0.5 text-xs font-bold text-brand-pink-dark">{money(product.price)}</p>
                          <button
                            type="button"
                            disabled={product.available <= 0}
                            onClick={() => addItem({
                              productId: product.id,
                              variantId: null,
                              name: product.name,
                              price: product.price,
                              image: product.image,
                              maxStock: product.available,
                              categoryId: product.categoryId,
                            })}
                            className="mt-1 cursor-pointer text-[11px] font-semibold text-brand-pink-dark disabled:cursor-not-allowed disabled:text-brand-muted"
                          >
                            {product.available > 0 ? "Agregar al carrito" : "Sin stock"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="mr-16 w-fit rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-brand-muted shadow-sm">
                Buscando en la tienda…
              </div>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div ref={endRef} />
          </div>

          {liveSettings.humanSeller.enabled && (
            <div className="border-t border-black/5 px-3 py-2">
              {liveSettings.humanSeller.available && liveSettings.humanSeller.whatsappUrl ? (
                <a
                  href={liveSettings.humanSeller.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-white"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Hablar con una persona
                </a>
              ) : (
                <p className="text-center text-[11px] text-brand-muted">
                  Atención humana: {liveSettings.humanSeller.scheduleText}. Ahora no disponible.
                </p>
              )}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-black/10 bg-white p-2.5 sm:p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 600))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={600}
              placeholder="¿Qué estás buscando?"
              aria-label="Mensaje"
              className="min-h-11 max-h-24 min-w-0 flex-1 resize-none rounded-xl border border-black/10 px-3 py-2.5 text-base text-brand-ink outline-none focus:border-brand-pink sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-11 shrink-0 cursor-pointer rounded-xl bg-brand-pink px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Cerrar asistente" : `Abrir ${liveSettings.name}`}
        aria-expanded={open}
        className="flex h-12 cursor-pointer items-center gap-1.5 rounded-full bg-brand-pink-dark px-3.5 text-white shadow-lg ring-2 ring-white transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.4-4 8-9 8a10.5 10.5 0 0 1-4-.8L3 21l1.7-4A7.4 7.4 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
        </svg>
        <span className="text-xs font-semibold">¿Te ayudo?</span>
      </button>
    </div>
  );
}

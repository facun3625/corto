"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getCartSessionId } from "@/lib/cartSession";

export type CartItem = {
  productId: string;
  // null para productos simples; id de la variante para los variables.
  variantId: string | null;
  name: string;
  // Descripción de la variante elegida ("Rojo / M"), solo para mostrar.
  variantLabel?: string;
  price: number;
  image: string | null;
  quantity: number;
  maxStock: number;
  // Se usa para las recomendaciones "También te puede gustar" del carrito.
  categoryId?: string;
};

// Una línea del carrito es producto + variante.
export function cartKey(item: { productId: string; variantId: string | null }): string {
  return `${item.productId}:${item.variantId ?? ""}`;
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  count: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "shop_cart_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw);
        setItems(
          parsed
            .filter((i) => typeof i.productId === "string")
            .map((i) => ({ ...i, variantId: i.variantId ?? null, maxStock: i.maxStock ?? Infinity }))
        );
      }
    } catch {
      // localStorage no disponible o dato corrupto: arrancamos con carrito vacío
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // Se sincroniza solo, en silencio, con cada cambio del carrito — no hay
  // "detector de abandono": es solo una foto del último estado conocido. El
  // endpoint borra el registro si el carrito quedó vacío (por eso comprar y
  // vaciar el carrito no deja un "abandonado" fantasma).
  useEffect(() => {
    if (!hydrated) return;
    const handle = setTimeout(() => {
      const sessionId = getCartSessionId();
      if (!sessionId) return;
      const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
      fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId: session?.user?.id,
          email: session?.user?.email,
          name: session?.user?.name,
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, name: i.name, price: i.price, quantity: i.quantity })),
          total,
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hydrated, session?.user?.id, session?.user?.email, session?.user?.name]);

  function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const key = cartKey(item);
      const existing = prev.find((i) => cartKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          cartKey(i) === key ? { ...i, quantity: Math.min(i.quantity + quantity, i.maxStock) } : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.maxStock) }];
    });
    setIsOpen(true);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => cartKey(i) !== key));
  }

  function setQuantity(key: string, quantity: number) {
    if (quantity <= 0) return removeItem(key);
    setItems((prev) =>
      prev.map((i) => (cartKey(i) === key ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i))
    );
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        setQuantity,
        clear,
        count,
        total,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}

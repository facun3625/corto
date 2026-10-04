// Datos del comprador que llegan del checkout (compartido entre las rutas que crean pedidos).
export type OrderCustomer = {
  name: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
};

// Datos extra que pide el checkout (OCA los necesita para registrar el envío)
export type OrderContact = { firstName: string | null; lastName: string | null; dni: string | null };

export function contactFromCustomer(customer: OrderCustomer & { firstName?: string; lastName?: string; dni?: string }): OrderContact {
  const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  return { firstName: clean(customer.firstName, 60), lastName: clean(customer.lastName, 60), dni: clean(customer.dni, 20) };
}

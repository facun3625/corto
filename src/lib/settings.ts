import { prisma } from "@/lib/prisma";
import { WHATSAPP_NUMBER, INSTAGRAM_HANDLE, DEFAULT_ADDRESS, DEFAULT_FRANCHISE_LOCATION, DEFAULT_CONTACT_EMAIL } from "@/lib/contact";
import { getHumanSellerAvailability } from "@/lib/ai/availability";
import { getFooterPages } from "@/lib/pages";
import { DEFAULT_FOOTER_TEXT } from "@/lib/contact";
import { resolveLogos, absoluteUrl } from "@/lib/logo";
import { getContactCards } from "@/lib/contactCards";
import { sanitizeBenefits } from "@/lib/benefitIcons";

export async function getStoreSettingsRow() {
  return prisma.storeSettings.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });
}

const DEFAULT_MARQUEE = ["Nueva colección", "Promociones", "Cortopassi - Tienda"];

// Vacío = el admin todavía no eligió categorías destacadas: el home usa las
// primeras categorías de nivel superior (ver app/page.tsx).
const DEFAULT_FEATURED_CATEGORY_IDS: string[] = [];

// Datos de contacto + marquee del sitio público, con los valores por
// defecto de lib/contact.ts como fallback mientras el admin no cargó nada.
export async function getSiteSettings() {
  const row = await getStoreSettingsRow();
  const assistantConfigured = Boolean(row.aiProvider && row.aiApiKey);
  // Ya no hay un toggle separado de "ofrecer atención humana": el horario
  // solo define CUÁNDO está disponible el WhatsApp (ya sea el botón dentro
  // del chat de la IA, o el botón flotante que lo reemplaza cuando la IA
  // está apagada) — ver SalesAssistant y SiteChrome.
  const humanSeller = getHumanSellerAvailability({
    aiHumanHandoffEnabled: true,
    aiHumanDays: row.aiHumanDays,
    aiHumanStartTime: row.aiHumanStartTime,
    aiHumanEndTime: row.aiHumanEndTime,
    whatsappPhone: row.whatsappPhone || WHATSAPP_NUMBER,
  });

  return {
    currency: row.currency,
    franchiseName: row.franchiseName || "Cortopassi - Tienda",
    footerText: row.footerText?.trim() || DEFAULT_FOOTER_TEXT,
    logos: resolveLogos(row),
    footerPages: await getFooterPages(),
    contactCards: await getContactCards(),
    home: {
      featuredEnabled: row.homeFeaturedEnabled,
      featuredTitle: row.homeFeaturedTitle?.trim() || "Lo más elegido de la tienda",
      offersEnabled: row.homeOffersEnabled,
      offersTitle: row.homeOffersTitle?.trim() || "Ofertas y promociones",
    },
    whatsappNumber: row.whatsappPhone || WHATSAPP_NUMBER,
    instagramHandle: row.instagramHandle || INSTAGRAM_HANDLE,
    address: row.address || DEFAULT_ADDRESS,
    contactEmail: row.contactEmail || DEFAULT_CONTACT_EMAIL,
    franchiseLocation: row.franchiseLocation || DEFAULT_FRANCHISE_LOCATION,
    marqueeItems: row.marqueeText
      ? row.marqueeText.split("\n").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_MARQUEE,
    featuredCategoryIds: row.featuredCategoryIds.length > 0 ? row.featuredCategoryIds : DEFAULT_FEATURED_CATEGORY_IDS,
    // Franja de beneficios del home — null en cualquier campo significa
    // "usar el valor calculado por defecto" (ver BenefitsStrip).
    // Franja de beneficios editable (1 a 6 ítems). Vacío = se usan los 3 de siempre (benefits)
    homeBenefits: sanitizeBenefits(row.homeBenefits),
    benefits: [
      { icon: row.benefit1Icon, title: row.benefit1Title, subtitle: row.benefit1Subtitle },
      { icon: row.benefit2Icon, title: row.benefit2Title, subtitle: row.benefit2Subtitle },
      { icon: row.benefit3Icon, title: row.benefit3Title, subtitle: row.benefit3Subtitle },
    ],
    // Pop-up promocional del sitio público — null si está apagado o si no
    // tiene ni título ni texto cargado (ver SitePopupModal).
    popup:
      row.popupEnabled && (row.popupTitle || row.popupBodyHtml)
        ? {
            title: row.popupTitle,
            bodyHtml: row.popupBodyHtml,
            scope: row.popupScope,
            frequency: row.popupFrequency,
          }
        : null,
    assistant: {
      enabled: row.aiAssistantEnabled && assistantConfigured,
      name: row.aiAssistantName?.trim() || "Vendedora virtual",
      welcomeMessage:
        row.aiWelcomeMessage?.trim() ||
        "¡Hola! Contame qué estás buscando y te ayudo a encontrar opciones de la tienda.",
      humanSeller,
    },
  };
}

export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;

export async function getHeroSlides() {
  return prisma.heroSlide.findMany({
    where: { enabled: true },
    orderBy: { position: "asc" },
    take: 3,
  });
}

// Logo para los mails (URL absoluta)
export async function getEmailLogoUrl(): Promise<string> {
  return absoluteUrl(resolveLogos(await getStoreSettingsRow()).header);
}

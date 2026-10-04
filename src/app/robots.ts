import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/carrito", "/mi-cuenta", "/login", "/registro", "/recuperar", "/integraciones", "/mantenimiento"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

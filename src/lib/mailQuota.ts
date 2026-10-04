import { prisma } from "@/lib/prisma";
import { getStoreSettingsRow } from "@/lib/settings";

export type MailQuotaStatus = {
  quota: number | null; // null = sin cupo cargado todavía
  used: number; // sentCount sumado de las campañas de este mes
  remaining: number | null;
  resetsOn: Date; // día 1 del próximo mes
  campaignsThisMonth: { id: string; subject: string; sentCount: number; createdAt: Date }[];
};

// El cupo es sobre las CAMPAÑAS de /admin/mailing (envíos masivos a listas),
// no sobre mails transaccionales (confirmación de pedido, etc.) — esos no
// suelen pegarle a los límites del proveedor de la misma forma. Se calcula
// desde el día 1 del mes en curso, en la zona horaria del server.
export async function getMailQuotaStatus(): Promise<MailQuotaStatus> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resetsOn = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [settings, campaignsThisMonth] = await Promise.all([
    getStoreSettingsRow(),
    prisma.mailCampaign.findMany({
      where: { createdAt: { gte: startOfMonth } },
      orderBy: { createdAt: "desc" },
      select: { id: true, subject: true, sentCount: true, createdAt: true },
    }),
  ]);

  const used = campaignsThisMonth.reduce((sum, c) => sum + c.sentCount, 0);
  const quota = settings.mailMonthlyQuota;

  return {
    quota,
    used,
    remaining: quota != null ? Math.max(0, quota - used) : null,
    resetsOn,
    campaignsThisMonth,
  };
}

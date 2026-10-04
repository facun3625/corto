import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getStoreSettingsRow } from "@/lib/settings";
import { resolveLogos } from "@/lib/logo";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const userLabel = session?.user?.name ?? session?.user?.email ?? "Admin";
  const logoUrl = resolveLogos(await getStoreSettingsRow()).header;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-white md:flex-row">
      <AdminSidebar userLabel={userLabel} logoUrl={logoUrl} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-4 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

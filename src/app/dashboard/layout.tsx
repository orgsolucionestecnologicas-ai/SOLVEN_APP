import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantId = await getTenantId();
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { onboardingCompleted: true },
    });
    if (tenant && !tenant.onboardingCompleted) {
      redirect("/onboarding");
    }
  }
  return <>{children}</>;
}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_TENANT_EMAIL = "demo@solven.app";
const DEMO_TENANT_ID = "seed_tenant_demo";

async function main() {
  console.log("Seeding demo tenant, user and subscription...");

  const tenant = await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      businessName: "Comercio Demo",
      email: DEMO_TENANT_EMAIL,
    },
  });

  const hashedPassword = await bcrypt.hash("demo1234", 10);

  await prisma.user.upsert({
    where: { email: DEMO_TENANT_EMAIL },
    update: {},
    create: {
      email: DEMO_TENANT_EMAIL,
      password: hashedPassword,
      name: "Comercio Demo",
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      status: "TRIAL",
      trialEndsAt,
    },
  });

  console.log(`Demo tenant ready — email: ${DEMO_TENANT_EMAIL}, password: demo1234`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

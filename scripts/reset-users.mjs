/**
 * reset-users.mjs
 * Elimina todos los usuarios y deja solo admin@solvenrs.com / admin
 * Uso: node --env-file=.env scripts/reset-users.mjs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando reset de usuarios...\n");

  // 1. Borrar audit logs (FK a User) antes de borrar usuarios
  const deletedLogs = await prisma.auditLog.deleteMany({});
  console.log(`🗑️  AuditLogs eliminados: ${deletedLogs.count}`);

  // 2. Eliminar todos los usuarios existentes
  const deleted = await prisma.user.deleteMany({});
  console.log(`🗑️  Usuarios eliminados: ${deleted.count}`);

  // 2. Buscar tenant de prueba o crear uno
  let tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        businessName: "SOLVEN Test",
        email: "admin@solvenrs.com",
        plan: "trial",
        active: true,
        onboardingCompleted: true,
      },
    });
    console.log(`🏢  Tenant creado: ${tenant.businessName} (${tenant.id})`);
  } else {
    console.log(`🏢  Tenant existente: ${tenant.businessName} (${tenant.id})`);
  }

  // 3. Asegurar que el tenant tiene suscripción ACTIVE
  const existing = await prisma.subscription.findUnique({
    where: { tenantId: tenant.id },
  });

  if (!existing) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        status: "ACTIVE",
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 año
      },
    });
    console.log("📋  Suscripción ACTIVE creada");
  } else if (existing.status !== "ACTIVE") {
    await prisma.subscription.update({
      where: { tenantId: tenant.id },
      data: { status: "ACTIVE" },
    });
    console.log(`📋  Suscripción actualizada a ACTIVE (era ${existing.status})`);
  } else {
    console.log("📋  Suscripción ya está ACTIVE");
  }

  // 4. Crear usuario admin
  const passwordHash = await bcrypt.hash("admin", 10);

  const user = await prisma.user.create({
    data: {
      email: "admin@solvenrs.com",
      password: passwordHash,
      name: "Admin Test",
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  console.log(`\n✅  Usuario creado:`);
  console.log(`   Email:      ${user.email}`);
  console.log(`   Contraseña: admin`);
  console.log(`   Rol:        ${user.role}`);
  console.log(`   Tenant:     ${tenant.businessName}`);
  console.log(`   TenantId:   ${tenant.id}`);
  console.log("\n🟢 Listo — podés iniciar sesión con admin@solvenrs.com / admin");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

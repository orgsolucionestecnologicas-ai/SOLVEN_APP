/**
 * swap-user.mjs
 * Reemplaza admin@solvenrs.com por demo@solven.app en el tenant existente.
 * El catálogo (productos, clientes, etc.) NO se toca — está en el tenant, no en el usuario.
 * Uso: node --env-file=.env scripts/swap-user.mjs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NEW_EMAIL    = "demo@solven.app";
const NEW_PASSWORD = "demo1234";
const NEW_NAME     = "Demo Icase";
const OLD_EMAIL    = "admin@solvenrs.com";

async function main() {
  console.log("🔄 Swap de usuario...\n");

  // 1. Tenant
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    console.error("❌ No hay tenant. Ejecuta reset:users primero.");
    process.exit(1);
  }
  console.log(`🏢 Tenant: ${tenant.businessName} (${tenant.id})`);

  // 2. Crear demo@solven.app si no existe
  const existing = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });
  if (existing) {
    console.log(`ℹ️  ${NEW_EMAIL} ya existe — se omite creación`);
  } else {
    const hash = await bcrypt.hash(NEW_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email:    NEW_EMAIL,
        password: hash,
        name:     NEW_NAME,
        role:     "OWNER",
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Usuario creado: ${NEW_EMAIL}`);
  }

  // 3. Eliminar admin@solvenrs.com (primero audit logs por FK)
  const adminUser = await prisma.user.findUnique({ where: { email: OLD_EMAIL } });
  if (adminUser) {
    await prisma.auditLog.deleteMany({ where: { userId: adminUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
    console.log(`🗑️  Usuario eliminado: ${OLD_EMAIL}`);
  } else {
    console.log(`ℹ️  ${OLD_EMAIL} no encontrado — nada que eliminar`);
  }

  // 4. Resumen
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id }, select: { email: true, role: true } });
  const prods  = await prisma.product.count({ where: { tenantId: tenant.id } });
  const custs  = await prisma.customer.count({ where: { tenantId: tenant.id } });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🟢 Estado actual del tenant "${tenant.businessName}":`);
  console.log(`   Usuarios    : ${users.map(u => `${u.email} (${u.role})`).join(", ")}`);
  console.log(`   Productos   : ${prods}`);
  console.log(`   Clientes    : ${custs}`);
  console.log(`\n   Login: ${NEW_EMAIL} / ${NEW_PASSWORD}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());

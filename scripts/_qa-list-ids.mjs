import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  select: { id: true, tenantId: true, role: true, email: true },
  take: 5
});
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();

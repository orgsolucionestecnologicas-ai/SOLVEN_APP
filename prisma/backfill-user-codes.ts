import { PrismaClient } from "@prisma/client";

function generateUserCode(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  const prefix = cleaned.length >= 2 ? cleaned.slice(0, 2) : cleaned.padEnd(2, "X");
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${digits}`;
}

const prisma = new PrismaClient();

async function main() {
  const usersWithoutCode = await prisma.user.findMany({
    where: { userCode: null }
  });

  for (const user of usersWithoutCode) {
    let userCode = generateUserCode(user.name || "US");
    let codeIsUnique = false;
    let attempts = 0;

    while (!codeIsUnique && attempts < 10) {
      const existing = await prisma.user.findFirst({
        where: { tenantId: user.tenantId, userCode, NOT: { id: user.id } }
      });
      if (!existing) codeIsUnique = true;
      else {
        userCode = generateUserCode(user.name || "US");
        attempts++;
      }
    }

    if (codeIsUnique) {
      await prisma.user.update({
        where: { id: user.id },
        data: { userCode }
      });
      console.log(`Updated user ${user.name} (${user.email}) → ${userCode}`);
    }
  }
}

main()
  .then(() => { console.log("Done."); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });

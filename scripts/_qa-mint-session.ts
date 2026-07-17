import { createSession } from "../src/lib/auth";

const [userId, tenantId, role] = process.argv.slice(2);
if (!userId || !tenantId) {
  console.error("uso: tsx scripts/_qa-mint-session.ts <userId> <tenantId> [role]");
  process.exit(1);
}

async function main() {
  const token = await createSession(userId, tenantId, "ACTIVE", null, role ?? "OWNER", null);
  console.log(token);
}

main();

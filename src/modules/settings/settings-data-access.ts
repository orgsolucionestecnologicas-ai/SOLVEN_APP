import type { StoreSettings } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type UpsertSettingsInput,
  validateUpsertSettingsInput
} from "./settings-validation";

export async function getSettings(tenantId: string): Promise<StoreSettings> {
  return prisma.storeSettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {}
  });
}

export async function upsertSettings(
  input: UpsertSettingsInput,
  tenantId: string
): Promise<StoreSettings> {
  const validated = validateUpsertSettingsInput(input);
  return prisma.storeSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...validated },
    update: validated
  });
}

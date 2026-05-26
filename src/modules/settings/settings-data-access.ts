import type { StoreSettings } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type UpsertSettingsInput,
  validateUpsertSettingsInput
} from "./settings-validation";

const SINGLETON_ID = "store";

export async function getSettings(): Promise<StoreSettings> {
  return prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {}
  });
}

export async function upsertSettings(input: UpsertSettingsInput): Promise<StoreSettings> {
  const validated = validateUpsertSettingsInput(input);
  return prisma.storeSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...validated },
    update: validated
  });
}

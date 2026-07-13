import { prisma } from "@/lib/prisma";

import { type ValidatedRolePermissionInput } from "./role-permission-validation";

export type RolePermissionRecord = {
  role: string;
  section: string;
  canAccess: boolean;
};

export async function listRolePermissions(tenantId: string): Promise<RolePermissionRecord[]> {
  return prisma.rolePermission.findMany({
    where: { tenantId },
    select: { role: true, section: true, canAccess: true }
  });
}

export async function upsertRolePermissions(
  tenantId: string,
  inputs: ValidatedRolePermissionInput[]
): Promise<RolePermissionRecord[]> {
  await prisma.$transaction(
    inputs.map((input) =>
      prisma.rolePermission.upsert({
        where: {
          tenantId_role_section: {
            tenantId,
            role: input.role,
            section: input.section
          }
        },
        update: { canAccess: input.canAccess },
        create: {
          tenantId,
          role: input.role,
          section: input.section,
          canAccess: input.canAccess
        }
      })
    )
  );

  return listRolePermissions(tenantId);
}

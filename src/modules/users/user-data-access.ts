import { Prisma } from "@prisma/client";

import { hashPassword } from "@/lib/auth";
import { generateUserCode } from "@/lib/generate-user-code";
import { prisma } from "@/lib/prisma";

import {
  type CreateUserInput,
  type UpdateUserRoleInput,
  UserValidationError,
  validateCreateUserInput,
  validateUpdateUserRoleInput
} from "./user-validation";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  userCode: string | null;
  createdAt: Date;
};

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  userCode: true,
  createdAt: true
} satisfies Prisma.UserSelect;

export async function listUsers(tenantId: string): Promise<UserSummary[]> {
  return prisma.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: userSummarySelect
  });
}

export async function createUser(
  userInput: CreateUserInput,
  tenantId: string
): Promise<UserSummary> {
  const validatedUser = validateCreateUserInput(userInput);

  const existing = await prisma.user.findUnique({ where: { email: validatedUser.email } });
  if (existing) {
    throw new UserValidationError(["Ya existe un usuario con ese email."]);
  }

  const hashedPassword = await hashPassword(validatedUser.password);

  let userCode = generateUserCode(validatedUser.name);
  let codeIsUnique = false;
  let attempts = 0;

  while (!codeIsUnique && attempts < 10) {
    const existing = await prisma.user.findFirst({
      where: { tenantId, userCode }
    });
    if (!existing) {
      codeIsUnique = true;
    } else {
      userCode = generateUserCode(validatedUser.name);
      attempts++;
    }
  }

  if (!codeIsUnique) {
    throw new UserValidationError(["No se pudo generar un código de usuario único. Intentá de nuevo."]);
  }

  return prisma.user.create({
    data: {
      tenantId,
      name: validatedUser.name,
      email: validatedUser.email,
      password: hashedPassword,
      role: validatedUser.role,
      userCode
    },
    select: userSummarySelect
  });
}

export async function updateUserRole(
  id: string,
  input: UpdateUserRoleInput,
  tenantId: string,
  currentUserId: string
): Promise<UserSummary> {
  if (id === currentUserId) {
    throw new UserValidationError(["No podés cambiar tu propio rol."]);
  }
  const role = validateUpdateUserRoleInput(input);

  return prisma.user.update({
    where: { id, tenantId },
    data: { role },
    select: userSummarySelect
  });
}

export async function deleteUser(
  id: string,
  tenantId: string,
  currentUserId: string
): Promise<void> {
  if (id === currentUserId) {
    throw new UserValidationError(["No podés eliminarte a vos mismo."]);
  }

  await prisma.user.delete({ where: { id, tenantId } });
}

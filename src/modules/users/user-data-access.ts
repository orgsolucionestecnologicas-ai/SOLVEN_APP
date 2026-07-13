import { Prisma } from "@prisma/client";

import { hashPassword, verifyPassword } from "@/lib/auth";
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
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  avatarUrl: string | null;
  hasPin: boolean;
};

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  userCode: true,
  active: true,
  createdAt: true,
  lastLoginAt: true,
  avatarUrl: true,
  pin: true
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

function toUserSummary({ pin, ...row }: UserRow): UserSummary {
  return { ...row, hasPin: pin !== null };
}

export async function listUsers(tenantId: string): Promise<UserSummary[]> {
  const rows = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: userSummarySelect
  });
  return rows.map(toUserSummary);
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

  const row = await prisma.user.create({
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
  return toUserSummary(row);
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

  const row = await prisma.user.update({
    where: { id, tenantId },
    data: { role },
    select: userSummarySelect
  });
  return toUserSummary(row);
}

export async function setUserActive(
  id: string,
  active: boolean,
  tenantId: string,
  currentUserId: string
): Promise<UserSummary> {
  if (id === currentUserId) {
    throw new UserValidationError(["No podés desactivarte a vos mismo."]);
  }

  const row = await prisma.user.update({
    where: { id, tenantId },
    data: { active },
    select: userSummarySelect
  });
  return toUserSummary(row);
}

export async function updateUserAvatar(
  id: string,
  avatarUrl: string | null,
  tenantId: string
): Promise<UserSummary> {
  if (avatarUrl !== null) {
    if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("data:image/")) {
      throw new UserValidationError(["La imagen de perfil no es válida."]);
    }
    if (avatarUrl.length > 3_000_000) {
      throw new UserValidationError(["La imagen de perfil no puede superar los 2 MB."]);
    }
  }

  const row = await prisma.user.update({
    where: { id, tenantId },
    data: { avatarUrl },
    select: userSummarySelect
  });
  return toUserSummary(row);
}

export async function updateUserPin(
  id: string,
  pin: string | null,
  tenantId: string
): Promise<UserSummary> {
  if (pin !== null && !/^\d{4}$/.test(pin)) {
    throw new UserValidationError(["El PIN debe tener exactamente 4 dígitos."]);
  }

  const hashedPin = pin !== null ? await hashPassword(pin) : null;

  const row = await prisma.user.update({
    where: { id, tenantId },
    data: { pin: hashedPin },
    select: userSummarySelect
  });
  return toUserSummary(row);
}

export async function verifyUserPin(
  id: string,
  pin: string,
  tenantId: string
): Promise<UserSummary | null> {
  const row = await prisma.user.findFirst({
    where: { id, tenantId },
    select: userSummarySelect
  });
  if (!row || !row.active || !row.pin) return null;

  const valid = await verifyPassword(pin, row.pin);
  if (!valid) return null;

  return toUserSummary(row);
}

export async function deleteUser(
  id: string,
  tenantId: string,
  currentUserId: string,
  confirmed: boolean = false
): Promise<{ deleted: boolean; salesCount: number }> {
  if (id === currentUserId) {
    throw new UserValidationError(["No podés eliminarte a vos mismo."]);
  }

  const user = await prisma.user.findFirstOrThrow({ where: { id, tenantId } });

  const salesCount = user.userCode
    ? await prisma.sale.count({ where: { tenantId, sellerCode: user.userCode } })
    : 0;

  if (salesCount > 0 && !confirmed) {
    return { deleted: false, salesCount };
  }

  await prisma.user.delete({ where: { id, tenantId } });
  return { deleted: true, salesCount };
}

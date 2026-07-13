export const ROLE_PERMISSION_SECTIONS = [
  "dashboard",
  "pos",
  "returns",
  "products",
  "customers",
  "cashMovements",
  "quotes",
  "reports",
  "promotions",
  "settings"
] as const;
export type RolePermissionSection = (typeof ROLE_PERMISSION_SECTIONS)[number];

export const ROLE_PERMISSION_ROLES = ["OWNER", "CASHIER", "INVENTORY", "READONLY", "SUPERVISOR"] as const;
export type RolePermissionRole = (typeof ROLE_PERMISSION_ROLES)[number];

export type RolePermissionInput = {
  role: string;
  section: string;
  canAccess: boolean;
};

export type ValidatedRolePermissionInput = {
  role: RolePermissionRole;
  section: RolePermissionSection;
  canAccess: boolean;
};

export class RolePermissionValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "RolePermissionValidationError";
  }
}

export function validateRolePermissionInputs(
  inputs: RolePermissionInput[]
): ValidatedRolePermissionInput[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new RolePermissionValidationError(["Debés enviar al menos un permiso para actualizar."]);
  }

  const validated: ValidatedRolePermissionInput[] = [];

  for (const input of inputs) {
    const role = input.role;
    const section = input.section;
    const canAccess = input.canAccess;

    if (!ROLE_PERMISSION_ROLES.includes(role as RolePermissionRole)) {
      throw new RolePermissionValidationError(["El rol indicado no es válido."]);
    }
    if (!ROLE_PERMISSION_SECTIONS.includes(section as RolePermissionSection)) {
      throw new RolePermissionValidationError(["La sección indicada no es válida."]);
    }
    if (typeof canAccess !== "boolean") {
      throw new RolePermissionValidationError(["El valor de acceso debe ser verdadero o falso."]);
    }
    if (role === "OWNER" && section === "settings" && canAccess === false) {
      throw new RolePermissionValidationError([
        "No podés quitarle el acceso a Configuración al propietario."
      ]);
    }

    validated.push({ role: role as RolePermissionRole, section: section as RolePermissionSection, canAccess });
  }

  return validated;
}

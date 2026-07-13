import { IVA_RATES, type IvaRate } from "@/modules/products/product-validation";

export type UpsertSettingsInput = {
  businessName?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  language?: string;
  printerEnabled?: boolean;
  soundsEnabled?: boolean;
  darkMode?: boolean;
  desktopNotifications?: boolean;
  arcaEnabled?: boolean;
  logoUrl?: string;
  receiptFooterMessage?: string;
  receiptThankYouMessage?: string;
  initialReceiptNumber?: number;
  defaultIvaRate?: number;
  businessType?: string;
  preferredPaymentMethod?: string;
  lowStockEmailAlerts?: boolean;
  cashDifferenceEmailAlerts?: boolean;
};

export type ValidatedSettingsInput = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  language: string;
  printerEnabled: boolean;
  soundsEnabled: boolean;
  darkMode: boolean;
  desktopNotifications: boolean;
  arcaEnabled: boolean;
  logoUrl: string;
  receiptFooterMessage: string;
  receiptThankYouMessage: string;
  initialReceiptNumber: number;
  defaultIvaRate: number;
  businessType: string;
  preferredPaymentMethod: string;
  lowStockEmailAlerts: boolean;
  cashDifferenceEmailAlerts: boolean;
};

export class SettingsValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "SettingsValidationError";
  }
}

export function validateUpsertSettingsInput(input: UpsertSettingsInput): ValidatedSettingsInput {
  const errors: string[] = [];

  const businessName = typeof input.businessName === "string" ? input.businessName.trim() : "";
  if (!businessName) errors.push("El nombre del negocio es requerido.");

  if (errors.length > 0) throw new SettingsValidationError(errors);

  return {
    businessName,
    ownerName: typeof input.ownerName === "string" ? input.ownerName.trim() : "",
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    email: typeof input.email === "string" ? input.email.trim() : "",
    address: typeof input.address === "string" ? input.address.trim() : "",
    taxId: typeof input.taxId === "string" ? input.taxId.trim() : "",
    currency: typeof input.currency === "string" ? input.currency.trim() : "ARS",
    timezone: typeof input.timezone === "string" ? input.timezone.trim() : "America/Argentina/Buenos_Aires",
    dateFormat: typeof input.dateFormat === "string" ? input.dateFormat.trim() : "DD/MM/YYYY",
    language: typeof input.language === "string" ? input.language.trim() : "es",
    printerEnabled: Boolean(input.printerEnabled),
    soundsEnabled: input.soundsEnabled !== undefined ? Boolean(input.soundsEnabled) : true,
    darkMode: Boolean(input.darkMode),
    desktopNotifications: Boolean(input.desktopNotifications),
    arcaEnabled: Boolean(input.arcaEnabled),
    logoUrl: typeof input.logoUrl === "string" ? input.logoUrl.trim() : "",
    receiptFooterMessage: typeof input.receiptFooterMessage === "string" ? input.receiptFooterMessage.trim() : "",
    receiptThankYouMessage: typeof input.receiptThankYouMessage === "string" ? input.receiptThankYouMessage.trim() : "¡Gracias por su compra!",
    initialReceiptNumber:
      typeof input.initialReceiptNumber === "number" && Number.isFinite(input.initialReceiptNumber) && input.initialReceiptNumber >= 0
        ? Math.floor(input.initialReceiptNumber)
        : 0,
    defaultIvaRate:
      typeof input.defaultIvaRate === "number" && IVA_RATES.includes(input.defaultIvaRate as IvaRate)
        ? input.defaultIvaRate
        : 0.21,
    businessType: typeof input.businessType === "string" ? input.businessType.trim() : "",
    preferredPaymentMethod:
      typeof input.preferredPaymentMethod === "string" && input.preferredPaymentMethod.trim()
        ? input.preferredPaymentMethod.trim()
        : "efectivo",
    lowStockEmailAlerts: Boolean(input.lowStockEmailAlerts),
    cashDifferenceEmailAlerts: Boolean(input.cashDifferenceEmailAlerts),
  };
}

export type CartItemForInvoice = {
  productName: string;
  quantity: number;
  unitPrice: number; // precio con IVA incluido
  ivaRate: number;   // decimal: 0, 0.105, 0.21, 0.27
};

export type IvaAlicuota = {
  id: number;    // ID AFIP: 3=0%, 4=10.5%, 5=21%, 6=27%
  baseImp: number;
  importe: number;
};

export type ARCAVoucherData = {
  concepto: number;      // 1=Productos, 2=Servicios, 3=Ambos
  docTipo: number;       // 99=Consumidor Final, 96=DNI, 80=CUIT
  docNro: string;
  cbteDesde: number;
  cbteHasta: number;
  cbteFch: string;       // YYYYMMDD
  impTotal: number;
  impTotConc: number;
  impNeto: number;
  impOpEx: number;
  impIVA: number;
  impTrib: number;
  monId: string;         // "PES"
  monCotiz: number;      // 1
  iva: IvaAlicuota[];
  voucherType: number;   // 1=Factura A, 6=Factura B, 11=Factura C
};

function getIvaAlicId(rate: number): number {
  if (rate === 0) return 3;
  if (rate === 0.025) return 9;
  if (rate === 0.05) return 8;
  if (rate === 0.105) return 4;
  if (rate === 0.21) return 5;
  if (rate === 0.27) return 6;
  return 3; // desconocido → exento
}

export function getVoucherType(condicionIVA: string, docTipo: number): number {
  if (condicionIVA === "MONO") return 11; // Factura C
  if (docTipo === 80) return 1;           // Factura A (RI → CUIT)
  return 6;                               // Factura B (RI → DNI/Consumidor)
}

export function buildARCAVoucher(
  items: CartItemForInvoice[],
  total: number,
  docTipo: number,
  docNro: string,
  puntoVenta: number,
  nextVoucherNumber: number,
  condicionIVA: string,
  concepto = 1
): ARCAVoucherData {
  // Group IVA amounts by alícuota ID
  const ivaMap = new Map<number, { base: number; amount: number }>();
  let impNeto = 0;
  let impOpEx = 0;

  for (const item of items) {
    const itemTotal = item.unitPrice * item.quantity;
    if (item.ivaRate === 0) {
      impOpEx += itemTotal;
    } else {
      const neto = itemTotal / (1 + item.ivaRate);
      const ivaAmount = itemTotal - neto;
      const alicId = getIvaAlicId(item.ivaRate);
      const prev = ivaMap.get(alicId) ?? { base: 0, amount: 0 };
      ivaMap.set(alicId, { base: prev.base + neto, amount: prev.amount + ivaAmount });
      impNeto += neto;
    }
  }

  const impIVA = Array.from(ivaMap.values()).reduce((s, v) => s + v.amount, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const today = new Date();
  const cbteFch = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("");

  return {
    concepto,
    docTipo,
    docNro: docNro === "" ? "0" : docNro,
    cbteDesde: nextVoucherNumber,
    cbteHasta: nextVoucherNumber,
    cbteFch,
    impTotal: round2(total),
    impTotConc: 0,
    impNeto: round2(impNeto),
    impOpEx: round2(impOpEx),
    impIVA: round2(impIVA),
    impTrib: 0,
    monId: "PES",
    monCotiz: 1,
    iva: Array.from(ivaMap.entries()).map(([id, v]) => ({
      id,
      baseImp: round2(v.base),
      importe: round2(v.amount),
    })),
    voucherType: getVoucherType(condicionIVA, docTipo),
  };
}

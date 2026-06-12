import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { ARCAEmissionError } from "./arca-errors";
import type { ARCACredentials } from "./token-cache";
import type { ARCAVoucherData } from "./voucher-builder";

export const WSFE_URLS = {
  homo: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  prod: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
} as const;

const NS = "http://ar.gov.afip.dif.FEV1/";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  removeNSPrefix: true,
});

async function soapPost(url: string, action: string, body: string): Promise<Record<string, unknown>> {
  const envelope =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>${body}</soapenv:Body>` +
    `</soapenv:Envelope>`;

  const response = await axios.post<string>(url, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${NS}${action}"`,
    },
    timeout: 30_000,
  });

  const parsed = parser.parse(response.data) as Record<string, unknown>;
  // After removeNSPrefix: Envelope → Body
  const env = (parsed["Envelope"] ?? parsed["SOAP-ENV:Envelope"] ?? {}) as Record<string, unknown>;
  const bodyNode = (env["Body"] ?? env["SOAP-ENV:Body"] ?? {}) as Record<string, unknown>;
  return bodyNode;
}

export type CAEResult = {
  cae: string;
  caeFchVto: string;
  voucherNumber: number;
};

export type DummyResult = {
  appServer: string;
  dbServer: string;
  authServer: string;
};

export async function testWsfe(url: string): Promise<DummyResult> {
  const body = await soapPost(url, "FEDummy", `<ar:FEDummy/>`);
  const resp = (body["FEDummyResponse"] ?? {}) as Record<string, unknown>;
  const result = (resp["FEDummyResult"] ?? {}) as Record<string, unknown>;
  return {
    appServer: String(result["AppServer"] ?? ""),
    dbServer: String(result["DbServer"] ?? ""),
    authServer: String(result["AuthServer"] ?? ""),
  };
}

export async function getLastVoucherNumber(
  url: string,
  credentials: ARCACredentials,
  cuit: string,
  puntoVenta: number,
  voucherType: number
): Promise<number> {
  const authXml =
    `<ar:Auth>` +
    `<ar:Token>${credentials.token}</ar:Token>` +
    `<ar:Sign>${credentials.sign}</ar:Sign>` +
    `<ar:Cuit>${cuit}</ar:Cuit>` +
    `</ar:Auth>`;

  const body = await soapPost(
    url,
    "FECompUltimoAutorizado",
    `<ar:FECompUltimoAutorizado>${authXml}<ar:PtoVta>${puntoVenta}</ar:PtoVta><ar:CbteTipo>${voucherType}</ar:CbteTipo></ar:FECompUltimoAutorizado>`
  );

  const resp = (body["FECompUltimoAutorizadoResponse"] ?? {}) as Record<string, unknown>;
  const result = (resp["FECompUltimoAutorizadoResult"] ?? {}) as Record<string, unknown>;

  // Error 602 = punto de venta no existe → primer comprobante será 1
  const errors = result["Errors"] as Record<string, unknown> | undefined;
  if (errors) {
    const err = (errors["Err"] ?? {}) as Record<string, unknown>;
    if (String(err["Code"]) !== "602") {
      throw new ARCAEmissionError(
        `WSFE FECompUltimoAutorizado: ${String(err["Msg"])}`,
        String(err["Code"])
      );
    }
    return 0;
  }

  return Number(result["CbteNro"] ?? 0);
}

export async function requestCAE(
  url: string,
  credentials: ARCACredentials,
  cuit: string,
  puntoVenta: number,
  voucher: ARCAVoucherData
): Promise<CAEResult> {
  const authXml =
    `<ar:Auth>` +
    `<ar:Token>${credentials.token}</ar:Token>` +
    `<ar:Sign>${credentials.sign}</ar:Sign>` +
    `<ar:Cuit>${cuit}</ar:Cuit>` +
    `</ar:Auth>`;

  const ivaXml =
    voucher.iva.length > 0
      ? `<ar:Iva>${voucher.iva
          .map(
            (a) =>
              `<ar:AlicIva><ar:Id>${a.id}</ar:Id><ar:BaseImp>${a.baseImp}</ar:BaseImp><ar:Importe>${a.importe}</ar:Importe></ar:AlicIva>`
          )
          .join("")}</ar:Iva>`
      : "";

  const detReq =
    `<ar:FECAEDetRequest>` +
    `<ar:Concepto>${voucher.concepto}</ar:Concepto>` +
    `<ar:DocTipo>${voucher.docTipo}</ar:DocTipo>` +
    `<ar:DocNro>${voucher.docNro}</ar:DocNro>` +
    `<ar:CbteDesde>${voucher.cbteDesde}</ar:CbteDesde>` +
    `<ar:CbteHasta>${voucher.cbteHasta}</ar:CbteHasta>` +
    `<ar:CbteFch>${voucher.cbteFch}</ar:CbteFch>` +
    `<ar:ImpTotal>${voucher.impTotal}</ar:ImpTotal>` +
    `<ar:ImpTotConc>${voucher.impTotConc}</ar:ImpTotConc>` +
    `<ar:ImpNeto>${voucher.impNeto}</ar:ImpNeto>` +
    `<ar:ImpOpEx>${voucher.impOpEx}</ar:ImpOpEx>` +
    `<ar:ImpIVA>${voucher.impIVA}</ar:ImpIVA>` +
    `<ar:ImpTrib>${voucher.impTrib}</ar:ImpTrib>` +
    `<ar:MonId>${voucher.monId}</ar:MonId>` +
    `<ar:MonCotiz>${voucher.monCotiz}</ar:MonCotiz>` +
    ivaXml +
    `</ar:FECAEDetRequest>`;

  const soapBody =
    `<ar:FECAESolicitar>` +
    authXml +
    `<ar:FeCAEReq>` +
    `<ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${puntoVenta}</ar:PtoVta><ar:CbteTipo>${voucher.voucherType}</ar:CbteTipo></ar:FeCabReq>` +
    `<ar:FeDetReq>${detReq}</ar:FeDetReq>` +
    `</ar:FeCAEReq>` +
    `</ar:FECAESolicitar>`;

  const body = await soapPost(url, "FECAESolicitar", soapBody);
  const resp = (body["FECAESolicitarResponse"] ?? {}) as Record<string, unknown>;
  const result = (resp["FECAESolicitarResult"] ?? {}) as Record<string, unknown>;

  // Header errors
  const errors = result["Errors"] as Record<string, unknown> | undefined;
  if (errors) {
    const err = (errors["Err"] ?? {}) as Record<string, unknown>;
    throw new ARCAEmissionError(`Error WSFE: ${String(err["Msg"])}`, String(err["Code"]));
  }

  const feDetResp = (result["FeDetResp"] ?? {}) as Record<string, unknown>;
  const detResult = (feDetResp["FECAEDetResponse"] ?? {}) as Record<string, unknown>;

  if (String(detResult["Resultado"]) === "R") {
    const obs = ((detResult["Observaciones"] as Record<string, unknown>)?.["Obs"] ?? {}) as Record<string, unknown>;
    throw new ARCAEmissionError(
      `Solicitud CAE rechazada: ${String(obs["Msg"] ?? "sin detalle")}`,
      String(obs["Code"] ?? "")
    );
  }

  const cae = String(detResult["CAE"] ?? "");
  const caeFchVto = String(detResult["CAEFchVto"] ?? "");
  const cbteDesde = Number(detResult["CbteDesde"] ?? voucher.cbteDesde);

  if (!cae) throw new ARCAEmissionError("WSFE no devolvió CAE en la respuesta");

  return { cae, caeFchVto, voucherNumber: cbteDesde };
}

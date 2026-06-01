import { Resend } from "resend";

const FROM = "SOLVEN <no-reply@solven.app>";
const FOOTER = `<p style="color:#94a3b8;font-size:12px;margin-top:32px">
  SOLVEN — Gestión Comercial | <a href="mailto:orgsolucionestecnologicas@gmail.com" style="color:#94a3b8">orgsolucionestecnologicas@gmail.com</a>
</p>`;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not configured — skipping email send");
    return null;
  }
  return new Resend(key);
}

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:0">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e2e8f0">
    <div style="margin-bottom:24px">
      <span style="background:#E85D04;color:#fff;font-weight:bold;font-size:18px;padding:6px 14px;border-radius:8px">SOLVEN</span>
    </div>
    ${body}
    ${FOOTER}
  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, businessName: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `¡Bienvenido a SOLVEN, ${businessName}!`,
    html: wrap(`
      <h2 style="color:#0f172a">¡Bienvenido a SOLVEN!</h2>
      <p style="color:#334155">Hola <strong>${businessName}</strong>,</p>
      <p style="color:#334155">Tu cuenta fue creada exitosamente. Tenés <strong>14 días gratis</strong> para explorar todas las funciones.</p>
      <p style="color:#334155">Durante este período podés registrar ventas, gestionar inventario, clientes, deudas y mucho más.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://solven-app-484v.vercel.app"}/dashboard"
         style="display:inline-block;background:#E85D04;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
        Ir al dashboard →
      </a>
    `)
  });
}

export async function sendTrialEndingEmail(to: string, businessName: string, daysLeft: number): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu prueba gratuita de SOLVEN vence en ${daysLeft} días`,
    html: wrap(`
      <h2 style="color:#0f172a">Tu prueba termina pronto</h2>
      <p style="color:#334155">Hola <strong>${businessName}</strong>,</p>
      <p style="color:#334155">Tu período de prueba gratuita vence en <strong>${daysLeft} días</strong>.</p>
      <p style="color:#334155">Para continuar usando SOLVEN sin interrupciones, activá tu suscripción ahora.</p>
      <a href="${process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "#"}"
         style="display:inline-block;background:#E85D04;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
        Activar suscripción →
      </a>
    `)
  });
}

export async function sendPaymentFailedEmail(to: string, businessName: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu pago de SOLVEN no pudo procesarse",
    html: wrap(`
      <h2 style="color:#dc2626">Problema con tu pago</h2>
      <p style="color:#334155">Hola <strong>${businessName}</strong>,</p>
      <p style="color:#334155">No pudimos procesar el pago de tu suscripción a SOLVEN.</p>
      <p style="color:#334155">Por favor actualizá tu método de pago para evitar interrupciones en el servicio.</p>
      <a href="${process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "#"}"
         style="display:inline-block;background:#E85D04;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
        Actualizar método de pago →
      </a>
    `)
  });
}

export async function sendCancellationEmail(to: string, businessName: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu suscripción a SOLVEN fue cancelada",
    html: wrap(`
      <h2 style="color:#0f172a">Suscripción cancelada</h2>
      <p style="color:#334155">Hola <strong>${businessName}</strong>,</p>
      <p style="color:#334155">Tu suscripción a SOLVEN fue cancelada. Lamentamos que hayas decidido irte.</p>
      <p style="color:#334155">Si fue un error o querés reactivar tu cuenta, contactanos.</p>
      <a href="mailto:orgsolucionestecnologicas@gmail.com"
         style="display:inline-block;background:#E85D04;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
        Contactar soporte →
      </a>
    `)
  });
}

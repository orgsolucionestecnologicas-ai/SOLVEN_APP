import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

// ─── Rate limiting simple (in-memory, por IP) ──────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, route: string, limit: number, windowMs: number): boolean {
  const key = `${ip}:${route}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

const PUBLIC_PATHS = ["/", "/login", "/register", "/suscripcion-vencida"];
const WEBHOOK_PREFIX = "/api/webhooks/";
const AUTH_PREFIX = "/api/auth/";

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith(WEBHOOK_PREFIX) ||
    pathname.startsWith(AUTH_PREFIX)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (pathname === "/api/auth/login") {
    if (!rateLimit(ip, "login", 10, 60_000)) {
      return new Response(JSON.stringify({ error: "Demasiados intentos. Esperá un momento." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  if (pathname === "/api/sales" && request.method === "POST") {
    if (!rateLimit(ip, "sales-post", 60, 60_000)) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intentá de nuevo." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  if (pathname.startsWith("/api/webhooks/rebill")) {
    if (!rateLimit(ip, "webhook-rebill", 100, 60_000)) {
      return new Response(JSON.stringify({ error: "Rate limit excedido." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySession(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { subscriptionStatus, trialEndsAt } = session;

  if (subscriptionStatus === "CANCELLED" || subscriptionStatus === "EXPIRED") {
    return NextResponse.redirect(new URL("/suscripcion-vencida", request.url));
  }

  if (subscriptionStatus === "TRIAL" && trialEndsAt) {
    if (new Date(trialEndsAt) < new Date()) {
      return NextResponse.redirect(new URL("/suscripcion-vencida", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-tenant-id", session.tenantId);
  response.headers.set("x-subscription-status", subscriptionStatus);
  if (trialEndsAt) response.headers.set("x-trial-ends-at", trialEndsAt);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

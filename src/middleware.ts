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

const PUBLIC_PATHS = ["/", "/login", "/register", "/pricing", "/onboarding", "/suscripcion-vencida"];
const PUBLIC_PREFIXES = ["/egg-token"];
const WEBHOOK_PREFIX = "/api/webhooks/";
const AUTH_PREFIX = "/api/auth/";
const CRON_PREFIX = "/api/cron/";

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith(WEBHOOK_PREFIX) ||
    pathname.startsWith(AUTH_PREFIX) ||
    pathname.startsWith(CRON_PREFIX) ||
    pathname === "/api/noa"
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

  const isApi = pathname.startsWith("/api/");
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySession(token);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { subscriptionStatus, trialEndsAt } = session;

  if (subscriptionStatus === "CANCELLED" || subscriptionStatus === "EXPIRED") {
    if (isApi) {
      return NextResponse.json({ error: "Suscripción vencida" }, { status: 402 });
    }
    return NextResponse.redirect(new URL("/suscripcion-vencida", request.url));
  }

  if (subscriptionStatus === "TRIAL" && trialEndsAt) {
    if (new Date(trialEndsAt) < new Date()) {
      if (isApi) {
        return NextResponse.json({ error: "Suscripción vencida" }, { status: 402 });
      }
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

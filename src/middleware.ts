import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

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

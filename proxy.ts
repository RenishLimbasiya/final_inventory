import { NextRequest, NextResponse } from "next/server";

/**
 * Request Log Entry
 */
interface RequestLog {
  timestamp: string;
  path: string;
  method: string;
  ip: string;
  userAgent?: string;
  authenticated: boolean;
}

/**
 * In-memory request logs
 * In production, use an external logging service
 */
const requestLogs: RequestLog[] = [];

/**
 * Protected routes that require authentication
 * Login and authentication endpoints remain public for demo sessions.
 */
const PROTECTED_ROUTES = ["/dashboard", "/products", "/alerts", "/movements"];
const PROTECTED_API_ROUTES = ["/api/products", "/api/movements", "/api/admin"];

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded ? forwarded.split(",")[0].trim() : realIp || "unknown";
}

function logRequest(log: RequestLog): void {
  requestLogs.push(log);

  if (requestLogs.length > 1000) {
    requestLogs.shift();
  }
}

function isProtectedRoute(pathname: string): boolean {
  return pathname === "/" ||
    [...PROTECTED_ROUTES, ...PROTECTED_API_ROUTES].some((route) => matchesRoute(pathname, route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const inventoryToken = request.cookies.get("inventory_token")?.value;
  const isProtected = isProtectedRoute(pathname);

  const clientIp = getClientIp(request);
  const requestLog: RequestLog = {
    timestamp: new Date().toISOString(),
    path: pathname,
    method: request.method,
    ip: clientIp,
    userAgent: request.headers.get("user-agent") || undefined,
    authenticated: !!inventoryToken,
  };

  logRequest(requestLog);

  if (isProtected && !inventoryToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  response.headers.set("X-Warehouse-Request", "true");
  response.headers.set("X-Request-IP", clientIp);
  response.headers.set("X-Request-Time", new Date().toISOString());

  if (inventoryToken) {
    response.headers.set("X-Authenticated", "true");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

export function getRequestLogs(limit: number = 100): RequestLog[] {
  return requestLogs.slice(-limit);
}

export function filterRequestLogs(criteria: {
  path?: string;
  method?: string;
  authenticated?: boolean;
  minutesAgo?: number;
}): RequestLog[] {
  let filtered = [...requestLogs];

  if (criteria.path) {
    const path = criteria.path;
    filtered = filtered.filter((log) => log.path.includes(path));
  }

  if (criteria.method) {
    filtered = filtered.filter((log) => log.method === criteria.method);
  }

  if (criteria.authenticated !== undefined) {
    filtered = filtered.filter(
      (log) => log.authenticated === criteria.authenticated,
    );
  }

  if (criteria.minutesAgo) {
    const cutoffTime = new Date(Date.now() - criteria.minutesAgo * 60 * 1000);
    filtered = filtered.filter((log) => new Date(log.timestamp) > cutoffTime);
  }

  return filtered;
}

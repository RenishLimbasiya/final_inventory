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
 * Public routes are: /, /login, /api/auth/*
 */
const PROTECTED_ROUTES = ["/dashboard", "/products", "/alerts", "/movements"];

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

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[${log.timestamp}] ${log.method} ${log.path} - IP: ${log.ip} - Auth: ${log.authenticated}`,
    );
  }
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
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
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  response.headers.set("X-Warehouse-Request", "true");
  response.headers.set("X-Request-IP", clientIp);
  response.headers.set("X-Request-Time", new Date().toISOString());

  if (inventoryToken) {
    response.headers.set("X-Authenticated", "true");
    response.headers.set("Authorization", `Bearer ${inventoryToken}`);
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
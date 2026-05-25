import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/admin", "/stats", "/codeforces", "/planner", "/reviews", "/readiness", "/learning", "/memory", "/reports", "/playground", "/whiteboard", "/coach", "/interview"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/stats/:path*", "/codeforces/:path*", "/planner/:path*", "/reviews/:path*", "/readiness/:path*", "/learning/:path*", "/memory/:path*", "/reports/:path*", "/playground/:path*", "/whiteboard/:path*", "/coach/:path*", "/interview/:path*"],
};

import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/admin", "/reviews", "/memory", "/coach", "/interview", "/roadmaps", "/today", "/library", "/settings"];

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
  matcher: ["/admin/:path*", "/reviews/:path*", "/memory/:path*", "/coach/:path*", "/interview/:path*", "/roadmaps/:path*", "/today/:path*", "/library/:path*", "/settings/:path*"],
};

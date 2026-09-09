import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSessionToken, unlockCookie } from "@/lib/pin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/api/plaid/webhook") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(unlockCookie.name)?.value;
  if (!(await isValidSessionToken(token))) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

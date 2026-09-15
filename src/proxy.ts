import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Pass-through (PIN unlock removed). Kept for Next request hooks. */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

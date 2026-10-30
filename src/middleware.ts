import { NextResponse, type NextRequest } from "next/server";

// Coarse gate only: real session validation happens server-side in requireUser().
const PUBLIC = ["/login", "/register", "/privacy"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p) || pathname === "/") return NextResponse.next();
  if (!req.cookies.get("dos_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname.startsWith("/api") ? "" : `?next=${encodeURIComponent(pathname)}`;
    if (pathname.startsWith("/api")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};

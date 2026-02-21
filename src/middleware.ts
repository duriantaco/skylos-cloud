import { updateSession } from "@/utils/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  console.log('[middleware]', request.method, request.nextUrl.pathname)

  // If a Supabase auth code lands on the wrong path, redirect to /auth/callback
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname === '/') {
    console.log('[middleware] caught stray auth code on /, redirecting to /auth/callback')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  const response = await updateSession(request);
  console.log('[middleware] response status:', response.status)
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Handle callback URLs or URLs with auth params to clean history
  const searchParams = nextUrl.searchParams;
  const hasAuthParams = searchParams.has('code') || searchParams.has('state') || searchParams.has('callbackUrl');
  const isCallbackPath = nextUrl.pathname.startsWith('/api/auth/callback');

  if (hasAuthParams || isCallbackPath) {
      const url = nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      url.hash = '';
      
      const response = NextResponse.redirect(url);
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

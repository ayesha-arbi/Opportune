import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/chat",
  "/tracker",
  "/onboarding",
  "/profile",
];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Refresh the Supabase auth session cookie on every request and enforce the
 * auth gates: protected pages require a session, auth pages bounce
 * signed-in users to the dashboard, and "/" routes by session state.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const redirectTo = (path: string) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = path;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  };

  if (!user && isProtected) {
    return redirectTo("/login");
  }
  if (user && isAuthPage) {
    return redirectTo("/dashboard");
  }
  if (pathname === "/") {
    return redirectTo(user ? "/dashboard" : "/login");
  }

  return response;
}

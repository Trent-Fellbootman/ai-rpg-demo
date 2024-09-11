import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnRestrictedPage = nextUrl.pathname.startsWith("/games");

      if (isOnRestrictedPage) {
        return isLoggedIn;
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/games", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;

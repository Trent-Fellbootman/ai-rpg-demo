import type { NextAuthConfig } from "next-auth";

import { constants } from "@/app/lib/utils/path";

export const authConfig = {
  pages: {
    signIn: constants.loginPagePath,
    newUser: constants.signupPagePath,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnRestrictedPage = nextUrl.pathname.startsWith(
        constants.gamePagesRootPath,
      );

      if (isOnRestrictedPage) {
        return isLoggedIn;
      } else if (isLoggedIn) {
        return Response.redirect(new URL(constants.dashboardPagePath, nextUrl));
      }

      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;

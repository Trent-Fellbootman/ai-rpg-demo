import { constants } from "@/app/lib/utils/path";

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AI RPG (Demo)",
  description: "Make beautiful websites regardless of your design experience.",
  navItems: [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
  ],
  navMenuItems: [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "New Session",
      href: constants.newSessionPagePath,
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
  links: {},
};

import { constants } from "@/app/lib/utils/path";

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AI RPG (Demo)",
  description: "Make beautiful websites regardless of your design experience.",
  navItems: [
    {
      label: "Home",
      href: constants.homePagePath,
    },
    {
      label: "My Game Sessions",
      href: constants.gameSessionsDashboardPagePath,
    },
    {
      label: "My Game Templates",
      href: constants.gameTemplatesDashboardPagePath,
    },
  ],
  navMenuItems: [
    {
      label: "Home",
      href: constants.homePagePath,
    },
    {
      label: "My Game Sessions",
      href: constants.gameSessionsDashboardPagePath,
    },
    {
      label: "My Game Templates",
      href: constants.gameTemplatesDashboardPagePath,
    },
    {
      label: "New Session",
      href: constants.newSessionPagePath,
    },
  ],
  links: {},
};

import { constants } from "@/app/lib/utils/path";

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AI RPG (Demo)",
  description: "Make beautiful websites regardless of your design experience.",
  navItems: [
    {
      label: "主页",
      href: constants.homePagePath,
    },
    {
      label: "我的游戏",
      href: constants.gameSessionsDashboardPagePath,
    },
    {
      label: "我的游戏模板",
      href: constants.gameTemplatesDashboardPagePath,
    },
  ],
  navMenuItems: [
    {
      label: "主页",
      href: constants.homePagePath,
    },
    {
      label: "我的游戏",
      href: constants.gameSessionsDashboardPagePath,
    },
    {
      label: "我的游戏模板",
      href: constants.gameTemplatesDashboardPagePath,
    },
  ],
  links: {},
};

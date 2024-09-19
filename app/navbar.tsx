"use client";

import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@nextui-org/navbar";
import { Link } from "@nextui-org/link";
import NextLink from "next/link";
import { Button } from "@nextui-org/button";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/app/ui/utils/theme-switch";
import { Logo } from "@/app/icons";
import { constants } from "@/app/lib/utils/path";

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <NextUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink
            className="flex justify-start items-center gap-1"
            href="/public"
          >
            <div className="max-w-10">
              <Logo />
            </div>
            <p className="text-3xl">Portal</p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <NavbarItem key={item.href}>
                <Button
                  as={Link}
                  className={isActive ? "text-primary" : ""}
                  href={item.href}
                  variant="light"
                >
                  <p className="text-medium">{item.label}</p>
                </Button>
              </NavbarItem>
            );
          })}
        </ul>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <Button as={Link} color="primary" href={constants.newSessionPagePath}>
          New Game Session
        </Button>
        <NavbarItem className="hidden sm:flex gap-2">
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig.navMenuItems.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <NavbarMenuItem key={`${item}-${index}`}>
                <Button
                  as={Link}
                  className={isActive ? "text-primary" : ""}
                  href={item.href}
                  variant="light"
                >
                  <p className="text-medium">{item.label}</p>
                </Button>
              </NavbarMenuItem>
            );
          })}
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};

import "@/styles/globals.css";
import { Viewport } from "next";
import React from "react";
import { Button } from "@nextui-org/button";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { Link } from "@nextui-org/link";

import { ThemeSwitch } from "@/app/ui/utils/theme-switch";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col h-screen">
      <div className="flex flex-row">
        <Button
          isIconOnly
          as={Link}
          color="default"
          href="/dashboard"
          variant="light"
        >
          <ArrowLeftIcon />
        </Button>
        <div className="w-full" />
        <ThemeSwitch />
      </div>
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        {children}
      </main>
    </div>
  );
}

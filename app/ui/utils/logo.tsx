"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export function Logo() {
  const { theme } = useTheme();

  const logoSrc =
    theme === "light" ? "/portal-logo-light.png" : "/portal-logo-dark.png";

  return (
    <Image
      priority
      unoptimized
      alt="Company Logo"
      className="rounded-xl"
      height={1024}
      src={logoSrc}
      width={1024}
    />
  );
}

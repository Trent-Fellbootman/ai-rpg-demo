"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export function Logo() {
  const { theme } = useTheme();

  return (
    <Image
      alt="Picture of the author"
      className="rounded-xl"
      height={1}
      sizes="100vw"
      src={`${theme == "light" ? "/portal-logo-light.png" : "/portal-logo-dark.png"}`}
      style={{
        width: "100%",
        height: "auto",
      }}
      width={1}
    />
  );
}

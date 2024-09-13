import * as React from "react";

import { IconSvgProps } from "@/types";

export const Logo: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
  ...props
}) => (
  <svg
    fill="none" // This ensures the SVG container has no fill.
    height={size || height}
    viewBox="0 0 32 32"
    width={size || width}
    {...props}
  >
    <path
      d="M 6.951994,31.360788 V 13.376521 c 0,-5.2796605 2.6824878,-10.5650659 9.864093,-10.5736359 6.802392,-0.00812 10.036151,5.5077632 10.036151,10.4227929 v 18.24549"
      fill="none" // Remove fill from the path
      stroke="currentColor" // Apply current color to the stroke
      strokeWidth={2.5} // Set stroke width
    />
  </svg>
);

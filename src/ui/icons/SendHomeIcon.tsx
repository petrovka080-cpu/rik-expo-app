// src/ui/icons/SendHomeIcon.tsx
import React from "react";
import { Platform } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

export type SendHomeIconProps = {
  size?: number;
  color?: string;
};

export default function SendHomeIcon({
  size = 24,
  color = "#FFFFFF",
}: SendHomeIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...(Platform.OS === "web"
        ? ({ shapeRendering: "geometricPrecision" } as any)
        : null)}
    >
      <Path
        d="M12 3.25c.34 0 .67.13.92.38l7.5 7.5c.35.35.35.92 0 1.27-.35.35-.92.35-1.27 0L12 5.22 4.85 12.4c-.35.35-.92.35-1.27 0-.35-.35-.35-.92 0-1.27l7.5-7.5c.25-.25.58-.38.92-.38Z"
        fill={color}
      />
      <Rect x={7.6} y={11.6} width={2.8} height={9.8} rx={0.9} fill={color} />
      <Rect x={13.6} y={11.6} width={2.8} height={9.8} rx={0.9} fill={color} />
    </Svg>
  );
}


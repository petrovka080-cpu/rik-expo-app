import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_COLOR } from "./roleVisual";

type ChevronIndicatorProps = {
  size?: number;
  color?: string;
};

export default function ChevronIndicator({ size = 16, color = ROLE_COLOR.indicator }: ChevronIndicatorProps) {
  return <Ionicons name="chevron-forward" size={size} color={color} />;
}

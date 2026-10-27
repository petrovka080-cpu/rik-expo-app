import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { normText } from "../contractor.utils";

const normalizeTextChildren = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === "string") return normText(children);
  if (Array.isArray(children)) return children.map((child) => normalizeTextChildren(child));
  return children;
};

export default React.memo(function NormalizedText({ children, ...props }: TextProps) {
  return <RNText {...props}>{normalizeTextChildren(children)}</RNText>;
});

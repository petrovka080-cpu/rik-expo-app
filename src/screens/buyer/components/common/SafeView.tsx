import React from "react";
import { View, Text } from "react-native";

export type SafeViewProps = React.ComponentProps<typeof View> & {
  children?: React.ReactNode;
};

export function SafeView({ children, ...rest }: SafeViewProps) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === "string") {
      const t = c.trim();
      return t ? <Text key={`t${i}`}>{t}</Text> : null;
    }
    return c;
  });
  return <View {...rest}>{kids}</View>;
}


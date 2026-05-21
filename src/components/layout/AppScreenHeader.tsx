import React from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { APP_LAYOUT } from "./appLayout";

export type AppScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export function AppScreenHeader({
  title,
  subtitle,
  right,
  children,
  style,
  titleStyle,
}: AppScreenHeaderProps) {
  return (
    <View style={[styles.header, style]} testID="app.screen-header">
      {children ?? (
        <>
          <View style={styles.titleBlock}>
            {title ? <Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: APP_LAYOUT.headerHeightPx,
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  right: {
    flexShrink: 0,
  },
});

import React from "react";
import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type RoleScreenLayoutProps = {
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

/**
 * ROLE SCREEN LAYOUT
 *
 * All role screens must use this layout.
 * Do not create alternative role screen wrappers.
 *
 * Neutral screen composition shell:
 * header -> tabs -> content.
 * No navigation, no role/data logic, no side effects.
 */
export default function RoleScreenLayout({
  title,
  subtitle,
  header,
  tabs,
  children,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
}: RoleScreenLayoutProps) {
  const hasDefaultHeader = Boolean(title || subtitle);
  if (__DEV__ && (children == null || children === false)) {
    console.warn("RoleScreenLayout used without content");
  }

  return (
    <View style={[styles.screen, style]}>
      {header}
      {!header && hasDefaultHeader ? (
        <View style={styles.header}>
          {!!title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
          {!!subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
        </View>
      ) : null}
      {tabs}
      <View style={styles.contentContainer}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    opacity: 0.7,
    color: "#9CA3AF",
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
  },
});

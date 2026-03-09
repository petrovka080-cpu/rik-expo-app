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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
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

import React from "react";
import type { ReactNode } from "react";
import { logger } from "../../lib/logger";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { ROLE_COLOR, ROLE_SPACE, ROLE_TYPE } from "../../ui/roleVisual";

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
  if (children == null || children === false) {
    logger.warn("RoleScreenLayout", "used without content");
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
    paddingHorizontal: ROLE_SPACE.lg,
    paddingTop: ROLE_SPACE.md,
    paddingBottom: ROLE_SPACE.md,
  },
  title: {
    ...ROLE_TYPE.headerTitle,
    color: ROLE_COLOR.text,
  },
  subtitle: {
    marginTop: ROLE_SPACE.xs,
    ...ROLE_TYPE.headerSubtitle,
    opacity: 0.82,
    color: ROLE_COLOR.subText,
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

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

export type SectionBlockProps = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

/**
 * SectionBlock is a neutral layout/visual primitive.
 * It intentionally contains no interaction, navigation, or business behavior.
 */
export default function SectionBlock({
  title,
  subtitle,
  right,
  children,
  compact = false,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
}: SectionBlockProps) {
  const hasHeader = Boolean(title || subtitle || right);

  return (
    <View style={[styles.base, compact ? styles.baseCompact : styles.baseRegular, style]}>
      {hasHeader ? (
        <View style={[styles.headerRow, compact ? styles.headerRowCompact : styles.headerRowRegular]}>
          <View style={styles.headerTextCol}>
            {!!title && (
              <Text numberOfLines={1} style={[styles.title, compact ? styles.titleCompact : styles.titleRegular, titleStyle]}>
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text
                numberOfLines={2}
                style={[styles.subtitle, compact ? styles.subtitleCompact : styles.subtitleRegular, subtitleStyle]}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {right ? <View style={styles.rightSlot}>{right}</View> : null}
        </View>
      ) : null}

      <View style={[styles.content, compact ? styles.contentCompact : styles.contentRegular, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
  },
  baseRegular: {
    marginBottom: 14,
  },
  baseCompact: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerRowRegular: {
    marginBottom: 10,
    gap: 10,
  },
  headerRowCompact: {
    marginBottom: 8,
    gap: 8,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rightSlot: {
    marginLeft: 8,
    alignSelf: "center",
  },
  title: {
    fontWeight: "800",
    color: "#F8FAFC",
  },
  titleRegular: {
    fontSize: 16,
    lineHeight: 20,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 2,
  },
  subtitleRegular: {
    fontSize: 12,
    lineHeight: 16,
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    width: "100%",
  },
  contentRegular: {
    gap: 10,
  },
  contentCompact: {
    gap: 8,
  },
});

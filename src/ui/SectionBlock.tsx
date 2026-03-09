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
import { ROLE_COLOR, ROLE_SPACE, ROLE_TYPE } from "./roleVisual";

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
    marginTop: ROLE_SPACE.xl,
    marginBottom: 0,
  },
  baseCompact: {
    marginTop: ROLE_SPACE.md,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerRowRegular: {
    marginBottom: ROLE_SPACE.md,
    gap: ROLE_SPACE.md,
  },
  headerRowCompact: {
    marginBottom: ROLE_SPACE.sm,
    gap: ROLE_SPACE.sm,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rightSlot: {
    marginLeft: ROLE_SPACE.sm,
    alignSelf: "flex-start",
  },
  title: {
    ...ROLE_TYPE.sectionTitle,
    color: ROLE_COLOR.text,
    opacity: 0.82,
  },
  titleRegular: {
    fontSize: ROLE_TYPE.sectionTitle.fontSize,
    lineHeight: ROLE_TYPE.sectionTitle.lineHeight,
  },
  titleCompact: {
    fontSize: ROLE_TYPE.sectionTitle.fontSize,
    lineHeight: ROLE_TYPE.sectionTitle.lineHeight,
  },
  subtitle: {
    color: ROLE_COLOR.subText,
    fontWeight: "400",
    marginTop: ROLE_SPACE.xs,
    opacity: 0.86,
  },
  subtitleRegular: {
    fontSize: 13,
    lineHeight: 18,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    width: "100%",
  },
  contentRegular: {
    gap: ROLE_SPACE.md,
  },
  contentCompact: {
    gap: 8,
  },
});

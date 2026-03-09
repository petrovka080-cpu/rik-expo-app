import React from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { ROLE_COLOR, ROLE_RADIUS, ROLE_SPACE, ROLE_TYPE } from "../../ui/roleVisual";

export type RoleCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: ReactNode;
  rightIndicator?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
};

/**
 * Neutral role list card.
 * Presentation-only wrapper without data, role, or navigation logic.
 */
export function RoleCard({
  title,
  subtitle,
  meta,
  status,
  rightIndicator,
  onPress,
  style,
  titleStyle,
  subtitleStyle,
  metaStyle,
}: RoleCardProps) {
  const content = (
    <View style={[s.card, style]}>
      <View style={s.left}>
        <Text style={[s.title, titleStyle]} numberOfLines={2}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={[s.subtitle, subtitleStyle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}

        {meta ? (
          <Text style={[s.meta, metaStyle]} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>

      {(status || rightIndicator) ? (
        <View style={s.right}>
          {status}
          {rightIndicator}
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pressable, pressed && s.pressed]}>
      {content}
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressable: {
    borderRadius: ROLE_RADIUS.card,
  },
  card: {
    borderRadius: ROLE_RADIUS.card,
    paddingVertical: ROLE_SPACE.lg,
    paddingHorizontal: ROLE_SPACE.lg,
    marginBottom: ROLE_SPACE.md,
    backgroundColor: ROLE_COLOR.cardBg,
    borderWidth: 1,
    borderColor: ROLE_COLOR.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: ROLE_SPACE.md,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...ROLE_TYPE.cardTitle,
    color: ROLE_COLOR.text,
  },
  subtitle: {
    ...ROLE_TYPE.subtitle,
    color: "#E2E8F0",
    opacity: 0.84,
    marginTop: ROLE_SPACE.xs,
  },
  meta: {
    ...ROLE_TYPE.meta,
    color: ROLE_COLOR.subText,
    opacity: 0.84,
    marginTop: ROLE_SPACE.sm,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: ROLE_SPACE.sm,
    flexShrink: 0,
    paddingTop: ROLE_SPACE.xs,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.997 }],
  },
});

export default RoleCard;

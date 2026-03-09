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
        <Text style={[s.title, titleStyle]} numberOfLines={1}>
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
    <Pressable onPress={onPress} style={({ pressed }) => pressed && s.pressed}>
      {content}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#101826",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E2E8F0",
    opacity: 0.8,
    marginTop: 2,
    lineHeight: 18,
  },
  meta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 17,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default RoleCard;

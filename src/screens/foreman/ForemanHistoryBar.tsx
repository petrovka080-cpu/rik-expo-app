import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  busy?: boolean;
  onOpenRequestHistory: () => void;
  onOpenSubcontractHistory: () => void;
  styles: typeof import("./foreman.styles").s;
  ui: { text: string };
};

export default function ForemanHistoryBar({
  busy = false,
  onOpenRequestHistory,
  onOpenSubcontractHistory,
  styles,
  ui,
}: Props) {
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== "web";
  const requestLabel = isMobile ? "Заявки" : "История заявок";
  const subcontractLabel = isMobile ? "Подряды" : "История подрядов";

  return (
    <View style={[styles.stickyBar, isMobile && { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.miniBar}>
        <Pressable
          testID="foreman-request-history-open"
          accessibilityLabel="foreman-request-history-open"
          accessible
          onPress={onOpenRequestHistory}
          disabled={busy}
          hitSlop={10}
          pressRetentionOffset={16}
          android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
          style={({ pressed }) => [
            styles.miniBtn,
            busy && { opacity: 0.5 },
            pressed && !busy ? styles.miniBtnPressed : null,
          ]}
        >
          <Ionicons name="time-outline" size={isMobile ? 19 : 18} color={ui.text} />
          <Text numberOfLines={1} style={[styles.miniText, isMobile && styles.miniTextCompact]}>
            {requestLabel}
          </Text>
        </Pressable>

        <Pressable
          testID="foreman-subcontract-history-open"
          accessibilityLabel="foreman-subcontract-history-open"
          accessible
          onPress={onOpenSubcontractHistory}
          disabled={busy}
          hitSlop={10}
          pressRetentionOffset={16}
          android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
          style={({ pressed }) => [
            styles.miniBtn,
            busy && { opacity: 0.5 },
            pressed && !busy ? styles.miniBtnPressed : null,
          ]}
        >
          <Ionicons name="briefcase-outline" size={isMobile ? 19 : 18} color={ui.text} />
          <Text numberOfLines={1} style={[styles.miniText, isMobile && styles.miniTextCompact]}>
            {subcontractLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

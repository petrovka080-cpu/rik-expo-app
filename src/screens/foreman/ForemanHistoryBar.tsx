import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  return (
    <View style={styles.stickyBar}>
      <View style={styles.miniBar}>
        <Pressable
          onPress={onOpenRequestHistory}
          disabled={busy}
          style={[styles.miniBtn, busy && { opacity: 0.5 }]}
        >
          <Ionicons name="time-outline" size={18} color={ui.text} />
          <Text style={styles.miniText}>История заявок</Text>
        </Pressable>

        <Pressable
          onPress={onOpenSubcontractHistory}
          disabled={busy}
          style={[styles.miniBtn, busy && { opacity: 0.5 }]}
        >
          <Ionicons name="briefcase-outline" size={18} color={ui.text} />
          <Text style={styles.miniText}>История подрядов</Text>
        </Pressable>
      </View>
    </View>
  );
}

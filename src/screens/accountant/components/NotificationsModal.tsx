import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { UI } from "../ui";
import { SafeView } from "../helpers";
import type { NotificationRow } from "../types";

export default function NotificationsModal({
  visible,
  notifs,
  onMarkAllRead,
  onClose,
}: {
  visible: boolean;
  notifs: NotificationRow[];
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 }}>
        <View
          style={{
            backgroundColor: UI.cardBg,
            borderRadius: 16,
            padding: 12,
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.16)",
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 16, marginBottom: 10, color: UI.text }}>
            Уведомления
          </Text>

          <ScrollView contentContainerStyle={{ gap: 8 }}>
            {!notifs || notifs.length === 0 ? (
              <Text style={{ color: UI.sub, fontWeight: "700" }}>Нет непрочитанных</Text>
            ) : (
              notifs.map((n) => (
                <View
                  key={String(n.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    padding: 10,
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: UI.text }}>{n.title ?? "—"}</Text>

                  {!!n.body && <Text style={{ color: UI.sub, marginTop: 2 }}>{n.body}</Text>}

                  <Text style={{ color: UI.sub, marginTop: 4, fontSize: 11 }}>
                    {n.created_at ? new Date(String(n.created_at)).toLocaleString() : "—"}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <SafeView style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={onMarkAllRead}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: UI.btnApprove,
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>Отметить прочитанными</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                backgroundColor: UI.btnNeutral,
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: UI.text, fontWeight: "900" }}>Закрыть</Text>
            </Pressable>
          </SafeView>
        </View>
      </View>
    </Modal>
  );
}

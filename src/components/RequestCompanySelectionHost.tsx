import React, { useLayoutEffect, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { getRequestCompanyPrompt, registerRequestCompanyPromptHost, subscribeRequestCompanyPrompt } from "../lib/api/requestCompanyPrompt";

// One application-level UI host serves the actual foreman/market/AI create
// callers. Choices are loaded for each operation; none becomes a global role.
export function RequestCompanySelectionHost({ actorId, blocked }: { actorId: string | null; blocked: boolean }) {
  const prompt = useSyncExternalStore(subscribeRequestCompanyPrompt, getRequestCompanyPrompt, getRequestCompanyPrompt);
  useLayoutEffect(() => registerRequestCompanyPromptHost({ actorId, blocked }), [actorId, blocked]);
  // RN Web portals live under body. The Modal itself must be gated in this
  // render; hiding its retained navigator ancestor cannot hide the portal.
  const visible = Boolean(prompt && !blocked && actorId && prompt.actorId === actorId);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => prompt?.cancel()}>
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 440, maxHeight: "80%", borderRadius: 16, padding: 20, backgroundColor: "#101826" }}>
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", color: "#F8FAFC", marginBottom: 16 }}>Компания заявки</Text>
        <ScrollView>
          {visible && prompt?.choices.map(choice => <Pressable accessibilityRole="button" disabled={!visible} key={choice.companyId} onPress={() => prompt.select(choice.companyId)} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#334155" }}>
            <Text style={{ color: "#F8FAFC", fontSize: 16 }}>{choice.name}</Text>
          </Pressable>)}
        </ScrollView>
        <Pressable accessibilityRole="button" disabled={!visible} onPress={() => prompt?.cancel()} style={{ paddingTop: 20 }}>
          <Text style={{ color: "#94A3B8", fontSize: 16 }}>Отмена</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}

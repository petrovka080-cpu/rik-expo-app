import { StyleSheet } from "react-native";

export const MAP_SCREEN_UI = {
  bg: "#020617",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  ok: "#22C55E",
};

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MAP_SCREEN_UI.bg },
  stage: { flex: 1 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: 320,
    backgroundColor: MAP_SCREEN_UI.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MAP_SCREEN_UI.border,
    padding: 14,
  },
  modalTitle: { color: MAP_SCREEN_UI.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  modalInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MAP_SCREEN_UI.border,
    color: MAP_SCREEN_UI.text,
    backgroundColor: "#020617",
    marginBottom: 8,
    fontSize: 13,
  },
  modalSend: {
    marginTop: 6,
    backgroundColor: MAP_SCREEN_UI.ok,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalSendText: { color: "#0B1120", fontWeight: "900" },
  modalCancel: { marginTop: 10, alignItems: "center" },
  modalCancelText: { color: MAP_SCREEN_UI.sub, fontWeight: "900" },
});

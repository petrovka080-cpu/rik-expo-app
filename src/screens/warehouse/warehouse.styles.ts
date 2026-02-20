// src/screens/warehouse/warehouse.styles.ts
import { Platform, StyleSheet } from "react-native";

export const UI = {
  bg: "#0B0F14",
  cardBg: "#101826",
  text: "#F8FAFC",
  sub: "#9CA3AF",
  border: "#1F2A37",

  tabActiveBg: "#101826",
  tabInactiveBg: "transparent",
  tabActiveText: "#F8FAFC",
  tabInactiveText: "#9CA3AF",

  btnPrimary: "rgba(255,255,255,0.06)",
  btnPrimaryBorder: "rgba(255,255,255,0.22)",

  btnApprove: "#22C55E",
  btnReject: "#EF4444",
  btnNeutral: "rgba(255,255,255,0.08)",

  accent: "#22C55E",

  pillBg: "rgba(255,255,255,0.06)",
  pillBorder: "rgba(255,255,255,0.12)",
};

export const s = StyleSheet.create({
  container: { flex: 1 },

  collapsingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: UI.cardBg,
    borderBottomWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 10 : 12,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },

  collapsingTitle: { fontWeight: "900", color: UI.text, marginBottom: 8 },

  tabs: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center" },

  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.tabInactiveBg,
  },
  tabActive: { backgroundColor: UI.tabActiveBg, borderColor: UI.accent },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.cardBg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
    minHeight: 72,
  },
  groupTitle: { fontSize: 18, fontWeight: "900", color: UI.text },
  cardMeta: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  rightStack: { alignItems: "flex-end", justifyContent: "center", gap: 8 },

  metaPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    flexShrink: 0,
  },
  metaPillText: { color: "#E5E7EB", fontWeight: "900", fontSize: 12 },

  openBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    minWidth: 96,
    alignItems: "center",
  },
  openBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13, letterSpacing: 0.2 },

  mobCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(16,24,38,0.92)",
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  mobMain: { flex: 1, minWidth: 0 },
  mobTitle: { fontSize: 16, fontWeight: "800", color: UI.text },
  mobMeta: { marginTop: 6, fontSize: 14, fontWeight: "700", color: UI.sub },

  sectionBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sectionBoxTitle: {
    color: UI.sub,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: UI.text,
    fontWeight: "800",
  },
});

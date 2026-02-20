// src/screens/director/director.styles.ts
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

  btnApprove: "#22C55E",
  btnReject: "#EF4444",
  btnNeutral: "rgba(255,255,255,0.08)",
  accent: "#22C55E",
} as const;

export const s = StyleSheet.create({
  container: { flex: 1 },

collapsingHeader: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,


  zIndex: 9999,
  elevation: 9999,

  backgroundColor: UI.cardBg,
  borderBottomWidth: 1,
  borderColor: UI.border,
  paddingHorizontal: 16,
  paddingTop: 0,

  paddingBottom: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 14,
},


  collapsingTitle: {
    fontWeight: "900",
    color: UI.text,
    marginBottom: 8,
  },


  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginHorizontal: -4,
    marginVertical: -4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.tabInactiveBg,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  tabActive: {
    backgroundColor: UI.tabActiveBg,
    borderColor: UI.accent,
  },

  // ===== SECTION HEADER + KPI =====
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    ...Platform.select({
      web: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      default: {
        flexDirection: "column",
        alignItems: "flex-start",
      },
    }),
  },

  sectionTitle: { fontSize: 20, fontWeight: "800", color: UI.text },

  kpiRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    marginHorizontal: -4,
    marginVertical: -4,
  },

  kpiPillHalf: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 4,
    marginVertical: 4,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
  },

  kpiLabel: { color: UI.sub, fontWeight: "700", fontSize: 12, flexShrink: 0 },
  kpiValue: { color: UI.text, fontWeight: "900", fontSize: 12 },

  // ===== LIST CARD =====
  group: { marginBottom: 12, paddingHorizontal: 16 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  // RIGHT STACK
  rightStack: { alignItems: "flex-end", justifyContent: "center" },
  rightStackSpacer: { height: 8 },

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
  openBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // ===== REQUEST NOTE =====
  reqNoteBox: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: UI.border,
    borderLeftWidth: 4,
    borderLeftColor: UI.accent,
  },
  reqNoteLine: { color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 },

  // ===== MODAL ITEM ROWS =====
  mobCard: {
    flexDirection: "row",
    alignItems: "center",
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

  kindPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "transparent",
  },
  kindPillText: { fontSize: 12, fontWeight: "700", color: UI.text },

  reqActionsBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  actionBtnWide: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  actionBtnSquare: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  sp8: { width: 8 },

  actionText: { color: "#fff", fontWeight: "900" },

  // ===== SHEET CONTAINER =====
  sheet: {
    height: "88%",
    backgroundColor: UI.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  sheetTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: {
    flex: 1,
    minWidth: 0,
    color: UI.text,
    fontWeight: "900",
    fontSize: 18,
  },
  sheetCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    flexShrink: 0,
    marginLeft: 10,
  },
  sheetCloseText: { color: "#0B0F14", fontWeight: "900", fontSize: 13 },
});

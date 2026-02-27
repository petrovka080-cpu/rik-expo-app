import { Platform, StyleSheet } from 'react-native';
import { TYPO, UI } from './foreman.ui';

export const s = StyleSheet.create({
  container: { flex: 1 },
  pagePad: { padding: 16, paddingBottom: 120 },

  small: {
    color: UI.sub,
    fontSize: TYPO.kpiLabel.fontSize,
    fontWeight: TYPO.kpiLabel.fontWeight,
    marginBottom: 6,
  },
  requiredAsterisk: { color: UI.btnReject, fontWeight: "900" },

  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: UI.text,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0,
  },

  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  requiredInputWrap: { position: "relative" },
  requiredInput: { paddingRight: 34 },
  requiredInputAsterisk: {
    position: "absolute",
    right: 14,
    top: 14,
    color: UI.btnReject,
    fontWeight: "900",
    fontSize: 16,
  },

  suggest: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // ===== dropdown overlay
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },

  modalSheet: Platform.select({
    web: {
      position: "absolute",
      left: 16,
      right: 16,
      top: 90,
      backgroundColor: UI.cardBg,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
    },
    default: {
      position: "absolute",
      left: 16,
      right: 16,
      top: 90,
      backgroundColor: UI.cardBg,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
  }),

  // ===== collapsing header (dark)
  cHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
    backgroundColor: UI.cardBg,
    borderBottomWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    paddingBottom: 10,
  },
  cTitle: { color: UI.text, fontWeight: TYPO.titleSm.fontWeight },

  requestSummaryBox: {
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 4,
    gap: 6,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },

  requestSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  requestNumber: { fontSize: 16, fontWeight: "900", color: UI.text },

  requestMeta: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  bgGlow: {
    position: "absolute",
    left: -80,
    right: -80,
    top: -120,
    height: 260,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderBottomLeftRadius: 260,
    borderBottomRightRadius: 260,
    opacity: 0.9,
  },

  // ===== section blocks
  section: {
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  sectionTitle: {
    color: UI.sub,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.4,
  },

  pickTabsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  pickTabBtn: {
    flex: 1,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  // Placeholder style keys used by tab buttons.
  pickTabCatalog: {},
  pickTabSoft: {},

  pickTabText: { color: UI.text, fontWeight: "900", fontSize: 14 },

  // ===== bottom bar (dark)
  stickyBar: {
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: UI.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  miniBar: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  miniBtn: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  miniText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // ===== history modal (bottom sheet dark)
  historyModal: {
    backgroundColor: UI.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    ...Platform.select({
      web: { boxShadow: "0px -4px 24px rgba(0, 0, 0, 0.35)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: -6 },
        shadowRadius: 18,
        elevation: 10,
      },
    }),
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyModalTitle: { fontSize: 18, fontWeight: "900", color: UI.text },
  historyModalClose: { color: "#E5E7EB", fontWeight: "900" },
  historyModalBody: { flexGrow: 1 },
  historyModalEmpty: {
    color: UI.sub,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "800",
  },
  historyModalList: { maxHeight: 360 },
  historyModalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    gap: 12,
  },
  historyModalPrimary: { fontWeight: "900", fontSize: 15, color: UI.text },
  historyModalMeta: { color: UI.sub, fontSize: 13, marginTop: 2, fontWeight: "800" },
  historyModalMetaSecondary: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "800",
  },

  historyStatusBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  historyPdfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  historyPdfBtnText: { fontSize: 12, fontWeight: "900", color: UI.text },

  // ===== draft list row
  draftRowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,

    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "rgba(16,24,38,0.92)",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },

  draftRowMain: {
    flex: 1,
    minWidth: 0,
  },

  draftRowTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: UI.text,
    lineHeight: 20,
  },

  draftRowMeta: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: UI.sub,
    lineHeight: 18,
  },

  draftRowStatus: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 16,
  },

  draftRowStatusStrong: {
    color: UI.text,
    fontWeight: "900",
  },

  rejectBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.btnReject,
  },
  rejectIcon: { color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 22 },

  // ===== draft card (entry)
  draftCard: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,

    padding: 14,
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(16,24,38,0.92)",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  draftTitle: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  draftNo: {
    marginTop: 6,
    color: UI.text,
    fontWeight: "900",
    fontSize: 18,
  },
  draftHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 18,
  },

  posPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  posPillText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  posCountPill: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  posCountText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 13,
  },

  // ===== draft sheet (bottom)
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
    gap: 10,
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
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexShrink: 0,
  },
  sheetCloseText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 13,
  },

  sheetMetaBox: {
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: UI.border,
    borderLeftWidth: 4,
    borderLeftColor: UI.accent,
  },
  sheetMetaLine: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  sheetMetaValue: {
    color: UI.text,
    fontWeight: "900",
  },

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionText: {
    color: UI.text,
    fontWeight: "900",
  },

  sheetSendPrimary: {
    marginTop: 10,
    height: 52,
    borderRadius: 18,
    backgroundColor: UI.btnApprove,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  sheetSendPrimaryText: {
    color: "#0B0F14",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  foremanSuggestBox: {
    marginTop: 6,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: UI.cardBg,
  },

  foremanSuggestRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  foremanSuggestText: {
    color: UI.text,
    fontWeight: "800",
    fontSize: 14,
  },
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

  sp8: { width: 8 },

  actionBtnSquare: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

});


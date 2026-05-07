import { StyleSheet } from 'react-native';

import { D, UI } from './buyerUi';

export const buyerStyles = StyleSheet.create({
  screen: { flex: 1 },

  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 2,
  },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  tabPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabPillActive: {
    backgroundColor: UI.cardBg,
    borderColor: UI.accent,
    borderWidth: 1,
  },
  tabPillText: {
    color: UI.sub,
    fontWeight: '600',
    fontSize: 13,
  },
  tabPillTextActive: { color: UI.text, fontWeight: '600' },

  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    // handled via kind in JS to provide semantic colors
  },
  tabBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  tabBadgeTextActive: { color: '#FFF' },

  group: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 12,
    overflow: 'visible',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
  },
  groupTitle: { fontSize: 16, fontWeight: '600', color: UI.text },
  groupMeta: { fontSize: 13, fontWeight: '600', color: UI.sub, marginTop: 4 },

  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    backgroundColor: UI.cardBg,
    marginBottom: 12,
    overflow: 'visible',
  },
  cardPicked: {
    borderColor: UI.accent,
    backgroundColor: 'rgba(34,197,94,0.04)',
  },

  cardTitle: { fontSize: 16, fontWeight: '600', color: UI.text },
  cardMeta: { marginTop: 4, color: UI.sub, fontSize: 13, fontWeight: '400' },

  smallBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { fontWeight: '900', color: UI.text, fontSize: 13, letterSpacing: 0.2 },

  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: { color: UI.accent, fontWeight: '600', fontSize: 18 },

  proposalCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },

  dirSheet: {
    height: '90%', // Standard Apple half-full height
    width: "100%",
    backgroundColor: '#0F172A', // Deep space blue for premium feel
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  dirSheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 8,
    marginBottom: 16,
  },
  dirSheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dirSheetTitle: {
    flex: 1,
    color: D.text,
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  dirSheetCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dirSheetCloseText: { color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 13 },

  sheetBody: {
    flex: 1,
    width: "100%",
  },

  sheetSection: {
    flex: 1,
    width: "100%",
  },

  dirMobCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  dirMobMain: { flex: 1 },
  dirMobTitle: { fontSize: 15, fontWeight: '900', color: D.text, lineHeight: 20 },
  dirMobMeta: { marginTop: 4, fontSize: 13, fontWeight: '700', color: D.sub },
  dirMobNote: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  reqNoteBox: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reqNoteLine: {
    color: UI.text,
    fontSize: 14,
    fontWeight: "700",
  },

  fieldInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: D.text,
    fontSize: 15,
  },

  suggestBoxInline: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#1A2433',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 60,
    maxHeight: 260,
    pointerEvents: 'auto',
  },
  suggestItem: {
    padding: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  buyerMobCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'visible',
  },
  buyerMobCardPicked: {
    borderColor: UI.accent,
    backgroundColor: 'rgba(34,197,94,0.06)',
    overflow: 'visible',
  },

  appCodeChip: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  appCodeChipText: {
    fontWeight: "700",
    fontSize: 12,
  },
  counterpartyFailureText: {
    color: "#fca5a5",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  editorCardBase: {
    position: "relative",
    overflow: "visible",
    borderWidth: 1,
  },
  editorCardDesktop: {
    marginTop: 0,
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderColor: "rgba(34,197,94,0.26)",
    backgroundColor: "rgba(2,132,199,0.06)",
  },
  editorCardMobile: {
    marginTop: 10,
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderColor: "rgba(59,130,246,0.24)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  editorStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  flexOne: {
    flex: 1,
  },
  inlineSuggestBox: {
    backgroundColor: "#1E2A38",
    zIndex: 3000,
    elevation: 160,
    maxHeight: 220,
  },
  inlineSuggestItem: {
    minHeight: 44,
    justifyContent: "center",
  },
  inlineSuggestItemText: {
    fontWeight: "800",
  },
  inlineSupplierList: {
    maxHeight: 220,
  },
  mobileEditButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.4)",
    borderWidth: 1,
    borderRadius: 10,
  },
  mobileEditButtonText: {
    color: "#60A5FA",
    fontWeight: "700",
    fontSize: 13,
  },
  mobileSupplierLabel: {
    fontWeight: "700",
    flex: 1,
  },
  mobileSupplierTrigger: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileSupplierTriggerDisabled: {
    opacity: 0.6,
  },
  mobileSupplierTriggerEnabled: {
    opacity: 1,
  },
  modalEmptyText: {
    fontWeight: "700",
    paddingVertical: 12,
  },
  modalSearchInput: {
    marginBottom: 12,
    minHeight: 46,
  },
  modalSupplierListContent: {
    paddingBottom: 24,
  },
  modalSupplierRow: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  modalSupplierRowDefault: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalSupplierRowSelected: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  modalSupplierRowText: {
    fontWeight: "800",
  },
  noteAutoCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  noteAutoLabel: {
    fontWeight: "900",
    marginBottom: 4,
  },
  noteAutoValue: {
    fontWeight: "800",
  },
  primaryFieldsBase: {
    gap: 8,
    position: "relative",
    overflow: "visible",
  },
  primaryFieldsClosed: {
    zIndex: 10,
    elevation: 1,
  },
  primaryFieldsInline: {
    flexDirection: "row",
  },
  primaryFieldsOpen: {
    zIndex: 1200,
    elevation: 80,
  },
  primaryFieldsStack: {
    flexDirection: "column",
  },
  rejectReasonCard: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rejectReasonStrong: {
    fontWeight: "800",
  },
  rejectReasonSubline: {
    fontWeight: "800",
    marginTop: 4,
    fontSize: 12,
  },
  rejectReasonText: {
    fontWeight: "900",
    fontSize: 12,
  },
  rejectedBadge: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  rejectedBadgeText: {
    fontWeight: "900",
    fontSize: 12,
  },
  rowContent: {
    gap: 8,
  },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  rowHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  rowHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rowMetaBlock: {
    gap: 4,
  },
  rowMetaStrong: {
    fontWeight: "800",
  },
  rowMetaText: {},
  rowShellBase: {
    position: "relative",
    overflow: "visible",
  },
  rowShellDefault: {
    zIndex: 1,
    elevation: 1,
  },
  rowShellSelected: {
    zIndex: 500,
    elevation: 30,
  },
  statusBadgeWrap: {
    marginLeft: "auto",
  },
  supplierFieldWrap: {
    flex: 1,
    position: "relative",
  },
  supplierFieldWrapClosed: {
    zIndex: 700,
    elevation: 40,
  },
  supplierFieldWrapOpen: {
    zIndex: 2600,
    elevation: 120,
  },
  supplierModalCloseButton: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  supplierModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  supplierModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  supplierModalSafeArea: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  supplierModalTitle: {
    fontWeight: "900",
    fontSize: 20,
  },
  toggleButton: {
    minWidth: 86,
    alignItems: "center",
  },

  sendBtnWarnWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: 2,
  }
});

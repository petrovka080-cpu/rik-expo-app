import { StyleSheet } from "react-native";

import { P_SHEET } from "../buyerUi";

const P = P_SHEET;

export const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  nativeShell: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  webCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    backgroundColor: "#0B1220",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  nativeCard: {
    flex: 1,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderTitle: {
    color: P.text,
    fontWeight: "900",
    fontSize: 20,
  },
  roundCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sheetInput: {
    backgroundColor: P.inputBg,
    borderColor: P.inputBorder,
    color: P.text,
  },
  searchInput: {
    marginBottom: 12,
    minHeight: 48,
  },
  supplierListContent: {
    paddingBottom: 24,
  },
  supplierItem: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  supplierItemText: {
    color: P.text,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyListText: {
    color: P.sub,
    fontWeight: "700",
    paddingVertical: 12,
    textAlign: "center",
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  screenHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  screenHeaderTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  smallRoundCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    color: P.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemMeta: {
    color: P.sub,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  infoChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoChipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  fieldLabel: {
    color: P.text,
    fontWeight: "700",
    marginBottom: 6,
  },
  tallInput: {
    minHeight: 48,
  },
  selectorButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorButtonText: {
    fontWeight: "700",
    flex: 1,
  },
  hardFailureText: {
    color: "#fca5a5",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  noteInput: {
    minHeight: 80,
    backgroundColor: P.inputBg,
    borderColor: P.inputBorder,
    color: P.text,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  autoNoteBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.inputBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  autoNoteTitle: {
    color: P.sub,
    fontWeight: "800",
    marginBottom: 6,
    fontSize: 13,
  },
  autoNoteValue: {
    color: P.text,
    fontWeight: "800",
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  doneButton: {
    backgroundColor: "#2563eb",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});

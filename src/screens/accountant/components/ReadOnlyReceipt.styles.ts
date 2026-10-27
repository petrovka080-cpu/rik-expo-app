import { Platform, StyleSheet } from "react-native";

import { UI } from "../ui";

export const receiptStyles = StyleSheet.create({
  sectionTitle: {
    fontWeight: "900",
    color: UI.text,
    marginBottom: 10,
  },
  amountCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  subLabel: {
    color: UI.sub,
    fontWeight: "800",
  },
  amountTitle: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 18,
    marginTop: 4,
  },
  spacer10: {
    height: 10,
  },
  spacer12: {
    height: 12,
  },
  rowGap10: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  valueText: {
    color: UI.text,
    fontWeight: "900",
    marginTop: 4,
  },
  marginBottom10: {
    marginBottom: 10,
  },
  marginTop8: {
    marginTop: 8,
  },
  textStrong: {
    color: UI.text,
    fontWeight: "900",
  },
  textEmphasis: {
    color: UI.text,
    fontWeight: "800",
  },
  bankToggle: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleText: {
    color: UI.sub,
    fontWeight: "900",
  },
  bankPanel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  supplierTitle: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 16,
  },
  headerSub: {
    color: UI.sub,
    fontWeight: "800",
    marginTop: 4,
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.30)",
  },
  statusPillText: {
    color: "rgba(134,239,172,0.95)",
    fontWeight: "900",
    fontSize: 12,
  },
  monospaceValue: {
    color: UI.text,
    fontWeight: "900",
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  attachmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonTextSmall: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 12,
  },
  gap8: {
    gap: 8,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
});

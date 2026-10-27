import { StyleSheet } from "react-native";

import { D } from "../buyerUi";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    color: D.text,
  },
  outlinePill: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  outlinePillText: {
    fontWeight: "900",
    color: D.text,
  },
  summaryCard: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryTitle: {
    fontWeight: "900",
    color: D.text,
    flex: 1,
  },
  summaryListBlock: {
    marginTop: 8,
  },
  previewItemText: {
    color: D.text,
    fontWeight: "700",
  },
  previewSeparator: {
    height: 6,
  },
  summaryMoreText: {
    color: D.sub,
    marginTop: 4,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionHelp: {
    color: D.sub,
    fontWeight: "800",
  },
  sectionTitle: {
    fontWeight: "900",
    marginBottom: 6,
    color: D.text,
  },
  marginTop10: {
    marginTop: 10,
  },
  marginTop14: {
    marginTop: 14,
  },
  optionWrapRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  activePill: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "rgba(34,197,94,0.55)",
  },
  inputChrome: {
    backgroundColor: "rgba(255,255,255,0.06)",
    color: D.text,
    borderColor: "rgba(255,255,255,0.12)",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCodeButton: {
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  countryCodeButtonText: {
    fontWeight: "900",
    color: D.text,
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: D.text,
    borderColor: "rgba(255,255,255,0.12)",
  },
  phoneHint: {
    fontSize: 11,
    color: D.sub,
    fontWeight: "800",
    marginTop: 6,
  },
  noteInput: {
    minHeight: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: D.text,
    borderColor: "rgba(255,255,255,0.12)",
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  footerButton: {
    flex: 1,
    alignItems: "center",
  },
  publishButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  publishButtonBusy: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: "#0B0F14",
    fontWeight: "900",
  },
});

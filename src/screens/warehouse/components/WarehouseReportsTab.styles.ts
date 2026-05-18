import { StyleSheet } from "react-native";

import { UI } from "../warehouse.styles";

export const localStyles = StyleSheet.create({
  dayGroupPressable: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  dayCountRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  reportsHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  reportsHeaderTitle: {
    color: UI.text,
    fontSize: 18,
    fontWeight: "600",
  },
  choiceContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  choiceTitle: {
    color: UI.text,
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 28,
  },
  modeButtons: {
    gap: 12,
  },
  modeButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  modeButtonPressed: {
    opacity: 0.9,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modeButtonText: {
    color: UI.text,
    fontSize: 17,
    fontWeight: "600",
  },
  activeRoot: {
    flex: 1,
    backgroundColor: UI.bg,
    minHeight: 0,
  },
  activeHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: UI.bg,
  },
  dayBackButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  activeDayTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: UI.text,
  },
  dayActions: {
    flexDirection: "row",
    gap: 8,
  },
  dayActionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  disabledAction: {
    opacity: 0.55,
  },
  flex: {
    flex: 1,
  },
  footerSpacer: {
    height: 8,
  },
});

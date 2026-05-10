import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
  },
  composerShell: {
    marginTop: 6,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    minHeight: 84,
    maxHeight: 160,
    marginBottom: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  composerInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(11,15,20,0.28)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  composeScrollContent: {
    paddingBottom: 16,
    gap: 12,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  contentFill: {
    flex: 1,
    minHeight: 0,
  },
  flexOne: {
    flex: 1,
  },
  footerDivider: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  helperText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  introCard: {
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  introBody: {
    fontSize: 13,
    marginTop: 4,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalKeyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
  },
  noticeCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  noticeDetail: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.9,
  },
  noticeTitle: {
    fontWeight: "800",
    fontSize: 13,
  },
  optionList: {
    gap: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  parseActionButton: {
    flex: 0,
    minWidth: 128,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  reviewCardGap: {
    gap: 2,
  },
  reviewCardMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  reviewItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  reviewSectionBody: {
    gap: 10,
    marginTop: 12,
  },
  reviewSectionBodyLarge: {
    gap: 12,
    marginTop: 12,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  reviewScrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  sessionHintText: {
    fontSize: 12,
  },
  selectedOptionText: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "700",
  },
});

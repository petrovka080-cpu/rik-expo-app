import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  actionButton: {
    height: 44,
  },
  actionButtonText: {
    fontWeight: "900",
    fontSize: 13,
  },
  listHeader: {
    padding: 16,
  },
  supplierDivider: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  integritySummaryCard: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
  },
  integritySummaryText: {
    color: "#FDBA74",
    fontWeight: "900",
    fontSize: 12,
  },
  analyticsSection: {
    marginBottom: 12,
  },
  analyticsSectionContent: {
    gap: 10,
  },
  sectionTitle: {
    fontWeight: "900",
    fontSize: 16,
  },
  analyticsSummaryCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    gap: 6,
  },
  analyticsHeadline: {
    fontWeight: "900",
    fontSize: 13,
  },
  analyticsText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 17,
  },
  analyticsLoading: {
    paddingVertical: 8,
    alignItems: "center",
  },
  analyticsInsightCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  analyticsInsightTitle: {
    fontWeight: "900",
    fontSize: 13,
  },
  analyticsInsightToneLabel: {
    fontWeight: "900",
    fontSize: 12,
  },
  analyticsInsightBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 17,
  },
  analyticsInsightSubBody: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    lineHeight: 17,
  },
  attachmentsSection: {
    marginBottom: 12,
  },
  attachmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentsTitle: {
    flex: 1,
    fontWeight: "900",
    fontSize: 16,
  },
  attachmentsMiniAction: {
    height: 32,
    paddingVertical: 0,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  attachmentsMiniActionText: {
    fontWeight: "900",
    fontSize: 11,
  },
  attachmentsErrorText: {
    marginTop: 6,
    color: "#FCA5A5",
    fontWeight: "900",
    fontSize: 12,
  },
  attachmentsList: {
    marginTop: 10,
    gap: 8,
  },
  attachmentCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentIcon: {
    fontSize: 16,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontWeight: "900",
    fontSize: 13,
  },
  attachmentsEmpty: {
    marginTop: 8,
    fontWeight: "800",
    fontSize: 13,
  },
  compositionSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  compositionSectionContent: {
    gap: 0,
  },
  lineCard: {
    marginHorizontal: 16,
    padding: 14,
  },
  lineIntegrityBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(249,115,22,0.14)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
  },
  lineIntegrityBadgeText: {
    color: "#FDBA74",
    fontWeight: "900",
    fontSize: 11,
  },
  lineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  lineMetaBullet: {
    color: "rgba(255,255,255,0.2)",
  },
  lineNoteBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
  },
});

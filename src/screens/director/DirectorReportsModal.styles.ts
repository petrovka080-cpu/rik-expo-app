import { StyleSheet } from "react-native";
import { UI } from "./director.styles";

export const styles = StyleSheet.create({
  cardMb10: {
    marginBottom: 10,
  },
  cardMx12Mb10: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  contentFlex: {
    flex: 1,
    minHeight: 0,
  },
  clearObjectButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  detailActionText: {
    color: UI.sub,
    fontWeight: "900",
  },
  detailActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  detailHeader: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: UI.bg,
  },
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detailListContent: {
    paddingTop: 12,
  },
  detailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: UI.bg,
  },
  detailTitle: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 16,
  },
  detailTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  errorSoftText: {
    color: "#FCA5A5",
  },
  emptyListText: {
    opacity: 0.7,
    color: UI.sub,
    paddingVertical: 8,
  },
  excelOpenButton: {
    backgroundColor: UI.btnNeutral,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterLabel: {
    color: UI.sub,
    fontWeight: "900",
    marginBottom: 6,
  },
  filterTabSpacing: {
    marginRight: 8,
    marginBottom: 8,
  },
  filterTabText: {
    fontWeight: "900",
  },
  filterTabTextActive: {
    color: UI.text,
  },
  filterTabTextInactive: {
    color: UI.sub,
  },
  flexOne: {
    flex: 1,
  },
  footerActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  footerOpenButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footerOpenText: {
    fontSize: 12,
  },
  listBottomPad4: {
    paddingBottom: 4,
  },
  mb10: {
    marginBottom: 10,
  },
  mt4: {
    marginTop: 4,
  },
  mt4WarningText: {
    marginTop: 4,
    color: "#FBBF24",
  },
  mt6: {
    marginTop: 6,
  },
  objectOptionText: {
    color: UI.text,
    fontWeight: "900",
  },
  objectOptionsList: {
    maxHeight: 420,
  },
  objectCloseText: {
    color: UI.sub,
    fontWeight: "900",
  },
  objectOverlayBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  objectSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  objectSheetTitle: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 16,
  },
  repOptLoadingText: {
    color: UI.sub,
    fontWeight: "800",
    marginLeft: 4,
    marginTop: 8,
  },
  rowGap8: {
    flexDirection: "row",
    gap: 8,
  },
  selectedObjectNameText: {
    color: UI.text,
    fontWeight: "900",
    maxWidth: 220,
  },
  spacer8: {
    height: 8,
  },
  tabSpacing: {
    marginRight: 8,
  },
  tabText: {
    fontWeight: "900",
  },
  tabTextActive: {
    color: UI.text,
  },
  tabTextInactive: {
    color: UI.sub,
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
});

import React from "react";
import { Pressable, Text, View } from "react-native";
import RNModal from "react-native-modal";
import { s } from "./director.styles";
import DirectorRequestSheet from "./DirectorRequestSheet";
import DirectorProposalContainer from "./DirectorProposalContainer";
import type {
  Group,
  ProposalAttachmentRow,
  ProposalHead,
  ProposalItem,
  RequestMeta,
  SheetKind,
} from "./director.types";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  sheetTitle: string;
  sheetKind: SheetKind;
  sheetRequest: Group | null;
  sheetProposalId: string | null;

  screenLock: boolean;
  actingId: string | null;
  reqDeleteId: number | string | null;
  reqSendId: number | string | null;
  isRequestPdfBusy: (g: Group) => boolean;
  onRejectItem: (it: any) => Promise<void>;
  onDeleteAll: (g: Group) => Promise<void>;
  onOpenPdf: (g: Group) => Promise<void>;
  onExportExcel: (g: Group) => void;
  onApproveAndSend: (g: Group) => Promise<void>;

  loadedByProp: Record<string, boolean>;
  itemsByProp: Record<string, ProposalItem[]>;
  propsHeads: ProposalHead[];
  propApproveId: string | null;
  propReturnId: string | null;
  decidingId: string | null;
  actingPropItemId: number | null;
  propAttByProp: Record<string, ProposalAttachmentRow[]>;
  propAttBusyByProp: Record<string, boolean>;
  reqItemNoteById: Record<string, string>;
  propReqIdsByProp: Record<string, string[]>;
  reqMetaById: Record<string, RequestMeta>;
  isProposalPdfBusy: (pidStr: string) => boolean;
  loadProposalAttachments: (pidStr: string) => Promise<void>;
  onOpenAttachment: (url: string, fileName: string) => void;
  rejectProposalItem: (pidStr: string, it: ProposalItem, items: ProposalItem[]) => Promise<void>;
  onDirectorReturn: (pidStr: string) => void;
  openProposalPdf: (pidStr: string, screenLocked: boolean) => Promise<void>;
  exportProposalExcel: (pidStr: string, pretty: string, items: ProposalItem[], screenLocked: boolean) => Promise<void>;
  approveProposal: (pidStr: string, approveDisabled: boolean) => Promise<void>;
};

export default function DirectorSheetModal(props: Props) {
  return (
    <RNModal
      isVisible={props.isVisible}
      onBackdropPress={props.onClose}
      onBackButtonPress={props.onClose}
      backdropOpacity={0.55}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={s.sheet}>
        <View style={s.sheetHandle} />

        <View style={s.sheetTopBar}>
          <Text style={s.sheetTitle} numberOfLines={1}>
            {props.sheetTitle}
          </Text>

          <Pressable onPress={props.onClose} style={s.sheetCloseBtn}>
            <Text style={s.sheetCloseText}>Свернуть</Text>
          </Pressable>
        </View>

        {props.sheetKind === "request" && props.sheetRequest ? (
          <DirectorRequestSheet
            sheetRequest={props.sheetRequest}
            screenLock={props.screenLock}
            actingId={props.actingId}
            reqDeleteId={props.reqDeleteId}
            reqSendId={props.reqSendId}
            isRequestPdfBusy={props.isRequestPdfBusy}
            onRejectItem={props.onRejectItem}
            onDeleteAll={props.onDeleteAll}
            onOpenPdf={props.onOpenPdf}
            onExportExcel={props.onExportExcel}
            onApproveAndSend={props.onApproveAndSend}
          />
        ) : null}

        {props.sheetKind === "proposal" && props.sheetProposalId ? (
          <DirectorProposalContainer
            sheetProposalId={String(props.sheetProposalId)}
            loadedByProp={props.loadedByProp}
            itemsByProp={props.itemsByProp}
            propsHeads={props.propsHeads}
            screenLock={props.screenLock}
            propApproveId={props.propApproveId}
            propReturnId={props.propReturnId}
            decidingId={props.decidingId}
            actingPropItemId={props.actingPropItemId}
            propAttByProp={props.propAttByProp}
            propAttBusyByProp={props.propAttBusyByProp}
            reqItemNoteById={props.reqItemNoteById}
            propReqIdsByProp={props.propReqIdsByProp}
            reqMetaById={props.reqMetaById}
            isProposalPdfBusy={props.isProposalPdfBusy}
            loadProposalAttachments={props.loadProposalAttachments}
            onOpenAttachment={props.onOpenAttachment}
            rejectProposalItem={props.rejectProposalItem}
            onDirectorReturn={props.onDirectorReturn}
            openProposalPdf={props.openProposalPdf}
            exportProposalExcel={props.exportProposalExcel}
            approveProposal={props.approveProposal}
          />
        ) : null}
      </View>
    </RNModal>
  );
}

import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
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
  propAttErrByProp: Record<string, string>;
  reqItemNoteById: Record<string, string>;
  propReqIdsByProp: Record<string, string[]>;
  reqMetaById: Record<string, RequestMeta>;
  isProposalPdfBusy: (pidStr: string) => boolean;
  loadProposalAttachments: (pidStr: string) => Promise<void>;
  onOpenAttachment: (file: ProposalAttachmentRow) => void;
  rejectProposalItem: (pidStr: string, it: ProposalItem, items: ProposalItem[]) => Promise<void>;
  onDirectorReturn: (pidStr: string) => void;
  openProposalPdf: (pidStr: string, screenLocked: boolean) => Promise<void>;
  exportProposalExcel: (pidStr: string, pretty: string, items: ProposalItem[], screenLocked: boolean) => Promise<void>;
  approveProposal: (pidStr: string, approveDisabled: boolean) => Promise<void>;
};

export default function DirectorSheetModal(props: Props) {
  return (
    <Modal
      visible={props.isVisible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          onPress={props.onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          <View style={s.sheetTopBar}>
            <Text style={s.sheetTitle} numberOfLines={1}>
              {props.sheetTitle}
            </Text>

            <Pressable testID="director-sheet-close" onPress={props.onClose} style={s.sheetCloseBtn}>
              <Text style={s.sheetCloseText}>Свернуть</Text>
            </Pressable>
          </View>

          <View style={s.sheetContent}>
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
                propAttErrByProp={props.propAttErrByProp}
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
        </View>
      </View>
    </Modal>
  );
}

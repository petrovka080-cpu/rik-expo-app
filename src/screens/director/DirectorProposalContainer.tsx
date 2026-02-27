import React from "react";
import { View } from "react-native";
import DirectorProposalSheet from "./DirectorProposalSheet";
import type { ProposalAttachmentRow, ProposalHead, ProposalItem, RequestMeta } from "./director.types";

type Props = {
  sheetProposalId: string;
  loadedByProp: Record<string, boolean>;
  itemsByProp: Record<string, ProposalItem[]>;
  propsHeads: ProposalHead[];
  screenLock: boolean;
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

export default function DirectorProposalContainer({
  sheetProposalId,
  loadedByProp,
  itemsByProp,
  propsHeads,
  screenLock,
  propApproveId,
  propReturnId,
  decidingId,
  actingPropItemId,
  propAttByProp,
  propAttBusyByProp,
  reqItemNoteById,
  propReqIdsByProp,
  reqMetaById,
  isProposalPdfBusy,
  loadProposalAttachments,
  onOpenAttachment,
  rejectProposalItem,
  onDirectorReturn,
  openProposalPdf,
  exportProposalExcel,
  approveProposal,
}: Props) {
  const pidStr = String(sheetProposalId);
  const loaded = !!loadedByProp[pidStr];
  const items = itemsByProp[pidStr] || [];
  const isEmptyProposal = loaded && (items?.length ?? 0) === 0;
  const approveDisabled =
    screenLock ||
    propApproveId === pidStr ||
    propReturnId === pidStr ||
    !loaded ||
    isEmptyProposal;

  const pretty = String(propsHeads.find((x) => String(x.id) === pidStr)?.pretty ?? "").trim();
  const totalSum = (items || []).reduce((acc, it) => {
    const pr = Number((it as any).price ?? 0);
    const q = Number((it as any).total_qty ?? 0);
    return acc + pr * q;
  }, 0);
  const isPdfBusy = isProposalPdfBusy(pidStr);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <DirectorProposalSheet
        pidStr={pidStr}
        items={items}
        loaded={loaded}
        totalSum={totalSum}
        screenLock={screenLock}
        decidingId={decidingId}
        actingPropItemId={actingPropItemId}
        propReturnId={propReturnId}
        propApproveId={propApproveId}
        approveDisabled={approveDisabled}
        files={propAttByProp[pidStr] || []}
        busyAtt={!!propAttBusyByProp[pidStr]}
        reqItemNoteById={reqItemNoteById}
        propReqIds={propReqIdsByProp?.[pidStr] || []}
        reqMetaById={reqMetaById}
        isPdfBusy={isPdfBusy}
        onRefreshAttachments={() => void loadProposalAttachments(pidStr)}
        onOpenAttachment={onOpenAttachment}
        onRejectItem={(it) => rejectProposalItem(pidStr, it, items)}
        onReturn={() => {
          if (screenLock) return;
          onDirectorReturn(pidStr);
        }}
        onPdf={() => openProposalPdf(pidStr, screenLock)}
        onExcel={() => exportProposalExcel(pidStr, pretty, items, screenLock)}
        onApprove={() => approveProposal(pidStr, approveDisabled)}
      />
    </View>
  );
}

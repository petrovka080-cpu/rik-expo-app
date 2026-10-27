// src/screens/warehouse/components/ReqIssueModal.tsx
import React, { useCallback, useMemo } from "react";
import { View, Text, Platform } from "react-native";
import RNModal from "../../../ui/React19SafeModal";

import { UI } from "../warehouse.styles";
import { nz } from "../warehouse.utils";
import type { ReqHeadRow, ReqItemUiRow, ReqPickLine } from "../warehouse.types";
import {
  selectReqIssueModalRowShape,
  selectReqIssueModalRowKey,
  type ReqIssueModalRowShape,
} from "./reqIssueModal.row.model";
import { ReqIssueModalRow } from "./ReqIssueModalRow";
import {
  CloseSquare,
  ReqIssueCartFooter,
  ReqIssueHeadCard,
  reqIssueModalStyles as localStyles,
} from "./ReqIssueModal.parts";
import { FlashList } from "../../../ui/FlashList";

type Props = {
  visible: boolean;
  onClose: () => void;

  title: string;
  head?: (ReqHeadRow | ReqItemUiRow) | null;

  reqItems: ReqItemUiRow[];
  reqItemsLoading: boolean;

  reqQtyInputByItem: Record<string, string>;
  setReqQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  recipientText: string;

  issueBusy: boolean;

  addReqPickLine: (item: ReqItemUiRow) => void;
  submitReqPick: () => void;

  reqPick: Record<string, ReqPickLine>;
  removeReqPickLine: (requestItemId: string) => void;

  issueMsg: { kind: "error" | "ok" | null; text: string };
};

type HeadLoose = (ReqHeadRow | ReqItemUiRow) & {
  contractor_name?: string | null;
  contractor_org?: string | null;
  subcontractor_name?: string | null;
  contractor_phone?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  planned_volume?: string | number | null;
  note?: string | null;
  comment?: string | null;
  volume?: string | number | null;
  qty_plan?: string | number | null;
  can_issue_now?: boolean;
  waiting_stock?: boolean;
};

function parseHeaderMeta(raw: string): { contractor: string; phone: string; volume: string } {
  const out = { contractor: "", phone: "", volume: "" };
  const normalizePhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };
  const contractorKeyRe =
    /(?:\u043f\u043e\u0434\u0440\u044f\u0434|\u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446|contractor|organization|supplier)/i;
  const phoneKeyRe = /(?:\u0442\u0435\u043b|phone|tel)/i;
  const volumeKeyRe = /(?:\u043e\u0431(?:\u044a|\u044c)?(?:\u0435|\u0451)?\u043c|volume)/i;
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([^:]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = String(m[1] || "").trim().toLowerCase();
    const val = String(m[2] || "").trim();
    if (!val) continue;
    if (!out.contractor && contractorKeyRe.test(key)) out.contractor = val;
    if (!out.phone && phoneKeyRe.test(key)) {
      const p = normalizePhone(val);
      if (p) out.phone = p;
    }
    if (!out.volume && volumeKeyRe.test(key)) out.volume = val;
  }
  return out;
}

export default function ReqIssueModal(props: Props) {
  const {
    visible,
    onClose,
    title,
    head,

    reqItems,
    reqItemsLoading,

    reqQtyInputByItem,
    setReqQtyInputByItem,

    recipientText,
    issueBusy,

    addReqPickLine,
    submitReqPick,

    reqPick,
    removeReqPickLine,

    issueMsg,
  } = props;

  const headData = (head ?? null) as HeadLoose | null;
  const headObj = String(headData?.object_name ?? "").trim();
  const headLevel = String(headData?.level_name ?? headData?.level_code ?? "").trim();
  const headSystem = String(headData?.system_name ?? headData?.system_code ?? "").trim();
  const headZone = String(headData?.zone_name ?? headData?.zone_code ?? "").trim();
  const headContractorRaw = String(
    headData?.contractor_name ??
      headData?.contractor_org ??
      headData?.subcontractor_name ??
      "",
  ).trim();
  const headPhoneRaw = String(
    headData?.contractor_phone ??
      headData?.phone ??
      headData?.phone_number ??
      "",
  ).trim();
  const normalizedHeadPhone = useMemo(() => {
    const src = String(headPhoneRaw || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  }, [headPhoneRaw]);
  const headVolumeRaw = String(
    headData?.planned_volume ??
      headData?.volume ??
      headData?.qty_plan ??
      "",
  ).trim();
  const fromNote = useMemo(() => {
    const packed = `${String(headData?.note ?? "")}\n${String(headData?.comment ?? "")}`;
    return parseHeaderMeta(packed);
  }, [headData]);
  const headContractor = headContractorRaw || fromNote.contractor;
  const headPhone = normalizedHeadPhone || fromNote.phone;
  const headVolume = headVolumeRaw || fromNote.volume;
  const headAccentColor =
    headData && "can_issue_now" in headData
      ? (headData.can_issue_now ? UI.accent : headData.waiting_stock ? "#F59E0B" : "rgba(156,163,175,0.65)")
      : UI.accent;

  const hasHead = !!(headObj || headLevel || headSystem || headZone || headContractor || headPhone || headVolume);

  const rows = useMemo(() => (reqItems || []).filter((it) => nz(it.qty_left, 0) > 0), [reqItems]);

  // Stable callbacks avoid rebuilding every row render path.
  const handleChangeQty = useCallback((requestItemId: string, value: string) => {
    setReqQtyInputByItem((p) => ({ ...(p || {}), [requestItemId]: value }));
  }, [setReqQtyInputByItem]);

  const handlePressMax = useCallback((requestItemId: string, maxUi: number) => {
    setReqQtyInputByItem((p) => ({ ...(p || {}), [requestItemId]: String(maxUi) }));
  }, [setReqQtyInputByItem]);

  const handlePressAdd = useCallback((shape: ReqIssueModalRowShape) => {
    addReqPickLine(shape.item);
  }, [addReqPickLine]);

  const reqPickLines = useMemo(() => Object.values(reqPick || {}), [reqPick]);
  const reqPickCount = reqPickLines.length;

  const renderReqIssueItem = useCallback(({ item }: { item: ReqItemUiRow }) => (
    <ReqIssueModalRow
      shape={selectReqIssueModalRowShape(item, reqQtyInputByItem, issueBusy, recipientText)}
      onChangeQty={handleChangeQty}
      onPressMax={handlePressMax}
      onPressAdd={handlePressAdd}
      issueBusy={issueBusy}
    />
  ), [handleChangeQty, handlePressAdd, handlePressMax, issueBusy, recipientText, reqQtyInputByItem]);

  const cartFooter = useMemo(() => (
    <ReqIssueCartFooter
      reqPickLines={reqPickLines}
      reqPickCount={reqPickCount}
      recipientText={recipientText}
      issueBusy={issueBusy}
      removeReqPickLine={removeReqPickLine}
      submitReqPick={submitReqPick}
    />
  ), [issueBusy, recipientText, removeReqPickLine, reqPickCount, reqPickLines, submitReqPick]);
  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      avoidKeyboard={false}
      propagateSwipe={Platform.OS !== "web"}
      style={localStyles.modal}
    >
      <View
        style={localStyles.sheet}
      >
        <View
          style={localStyles.handle}
        />

        <View style={localStyles.headerRow}>
          <Text style={localStyles.title} numberOfLines={1}>
            {title}
          </Text>
          <CloseSquare onPress={onClose} accessibilityLabel="\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c" size={46} iconSize={22} />
        </View>

        {hasHead ? (
          <ReqIssueHeadCard
            headObj={headObj}
            headLevel={headLevel}
            headSystem={headSystem}
            headZone={headZone}
            headContractor={headContractor}
            headPhone={headPhone}
            headVolume={headVolume}
            headAccentColor={headAccentColor}
          />
        ) : null}
        {reqItemsLoading ? (
          <Text style={localStyles.loadingText}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043e\u0437\u0438\u0446\u0438\u0439..."}</Text>
        ) : (
          <FlashList
            data={rows}
            // Stable key avoids virtualization restarts when rows update.
            keyExtractor={selectReqIssueModalRowKey}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            estimatedItemSize={148}
            renderItem={renderReqIssueItem}
            ListEmptyComponent={
              <Text style={localStyles.emptyText}>
                {"\u041d\u0435\u0442 \u0441\u0442\u0440\u043e\u043a \u0434\u043b\u044f \u0432\u044b\u0434\u0430\u0447\u0438 (\u043b\u0438\u043c\u0438\u0442\u044b \u0437\u0430\u043a\u0440\u044b\u0442\u044b)."}
              </Text>
            }
            ListFooterComponent={cartFooter}
          />
        )}

        {issueMsg.kind ? (
          <View
            style={localStyles.messageBox}
          >
            <Text style={localStyles.messageText}>{issueMsg.text}</Text>
          </View>
        ) : null}
      </View>
    </RNModal>
  );
}

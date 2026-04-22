// src/screens/warehouse/components/ReqIssueModal.tsx
import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import RNModal from "../../../ui/React19SafeModal";
import { Ionicons } from "@expo/vector-icons";
import { uomLabelRu } from "../warehouse.uom";

import { UI, s } from "../warehouse.styles";
import { nz } from "../warehouse.utils";
import type { ReqHeadRow, ReqItemUiRow, ReqPickLine } from "../warehouse.types";
import {
  selectReqIssueModalRowShape,
  selectReqIssueModalRowKey,
  type ReqIssueModalRowShape,
} from "./reqIssueModal.row.model";
import { ReqIssueModalRow } from "./ReqIssueModalRow";

import IconSquareButton from "../../../ui/IconSquareButton";
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

function CloseSquare({
  onPress,
  disabled,
  accessibilityLabel,
  size = 44,
  iconSize = 20,
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <IconSquareButton
      onPress={onPress}
      disabled={!!disabled}
      loading={false}
      accessibilityLabel={accessibilityLabel || "Закрыть"}
      width={size}
      height={size}
      radius={16}
      bg="rgba(255,255,255,0.06)"
      bgPressed="rgba(255,255,255,0.10)"
      bgDisabled="rgba(255,255,255,0.04)"
      spinnerColor={UI.text}
    >
      <Ionicons name="close" size={iconSize} color={UI.text} />
    </IconSquareButton>
  );
}

// ✅ дедуп по request_item_id: берём "самую сильную" строку
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

  // ✅ 1) фильтр по qty_left > 0
  const rows = useMemo(() => (reqItems || []).filter((it) => nz(it.qty_left, 0) > 0), [reqItems]);

  // ✅ Stable callbacks — not recreated per-renderItem call
  const handleChangeQty = useCallback((requestItemId: string, value: string) => {
    setReqQtyInputByItem((p) => ({ ...(p || {}), [requestItemId]: value }));
  }, [setReqQtyInputByItem]);

  const handlePressMax = useCallback((requestItemId: string, maxUi: number) => {
    setReqQtyInputByItem((p) => ({ ...(p || {}), [requestItemId]: String(maxUi) }));
  }, [setReqQtyInputByItem]);

  const handlePressAdd = useCallback((shape: ReqIssueModalRowShape) => {
    addReqPickLine(shape.item);
  }, [addReqPickLine]);

  // ✅ Memoized cart footer — not rebuilt on every render
  const cartFooter = useMemo(() => (
    <View style={{ marginTop: 12, paddingBottom: 12 }}>
      <Text style={{ color: UI.sub, fontWeight: "900" }}>
        В корзине: {Object.keys(reqPick || {}).length}
      </Text>

      {Object.values(reqPick || {}).slice(0, 8).map((ln) => (
        <View
          key={ln.request_item_id}
          style={{ marginTop: 8, flexDirection: "row", gap: 10, alignItems: "center" }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
              {String(ln.name_human || "Позиция")}
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "800" }} numberOfLines={1}>
              {`${uomLabelRu(ln.uom)} · ${String(ln.qty ?? "0")}`}
            </Text>
          </View>

          <CloseSquare
            onPress={() => removeReqPickLine(ln.request_item_id)}
            accessibilityLabel="Убрать из корзины"
            size={44}
            iconSize={20}
          />
        </View>
      ))}

      <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => submitReqPick()}
          disabled={issueBusy || Object.keys(reqPick || {}).length === 0 || !recipientText.trim()}
          style={[
            s.openBtn,
            {
              borderColor: UI.accent,
              opacity:
                issueBusy || Object.keys(reqPick || {}).length === 0 || !recipientText.trim()
                  ? 0.45
                  : 1,
            },
          ]}
        >
          <Text style={s.openBtnText}>{issueBusy ? "..." : "Выдать выбранное"}</Text>
        </Pressable>
      </View>
    </View>
  ), [reqPick, issueBusy, recipientText, removeReqPickLine, submitReqPick]);

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
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View
        style={{
          height: "90%",
          backgroundColor: UI.cardBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.18)",
            marginBottom: 10,
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Text style={{ flex: 1, color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
            {title}
          </Text>
          <CloseSquare onPress={onClose} accessibilityLabel="Свернуть" size={46} iconSize={22} />
        </View>

        {hasHead ? (
          <View
            style={{
              marginTop: 8,
              marginBottom: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "#0F172A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              borderLeftWidth: 4,
              borderLeftColor: headAccentColor,
            }}
          >
            {!!headObj ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Объект: ${headObj}`}
              </Text>
            ) : null}
            {!!headLevel ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Этаж/уровень: ${headLevel}`}
              </Text>
            ) : null}
            {!!headSystem ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Система: ${headSystem}`}
              </Text>
            ) : null}
            {!!headZone ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 0 }}>
                {`Зона: ${headZone}`}
              </Text>
            ) : null}
            {!!headContractor ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Подрядчик: ${headContractor}`}
              </Text>
            ) : null}
            {!!headPhone ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Телефон: ${headPhone}`}
              </Text>
            ) : null}
            {!!headVolume ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 0 }}>
                {`Объём: ${headVolume}`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {reqItemsLoading ? (
          <Text style={{ color: UI.sub, fontWeight: "800" }}>Загрузка позиций…</Text>
        ) : (
          <FlashList
            data={rows}
            // ✅ stable key: no positional index — prevents virtualization restarts on any update
            keyExtractor={selectReqIssueModalRowKey}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            estimatedItemSize={148}
            renderItem={({ item }) => (
              <ReqIssueModalRow
                shape={selectReqIssueModalRowShape(item, reqQtyInputByItem, issueBusy, recipientText)}
                onChangeQty={handleChangeQty}
                onPressMax={handlePressMax}
                onPressAdd={handlePressAdd}
                issueBusy={issueBusy}
              />
            )}
            ListEmptyComponent={
              <Text style={{ color: UI.sub, fontWeight: "800", paddingTop: 12 }}>
                Нет строк для выдачи (лимиты закрыты).
              </Text>
            }
            ListFooterComponent={cartFooter}
          />
        )}

        {issueMsg.kind ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Text style={{ color: UI.text, fontWeight: "900" }}>{issueMsg.text}</Text>
          </View>
        ) : null}
      </View>
    </RNModal>
  );
}

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/api/types";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { LineMeta } from "../buyer.types";
import { splitNote } from "../buyerUtils";
import { buyerStyles as styles } from "../buyer.styles";
import { P_LIST, P_SHEET } from "../buyerUi";
import type { StylesBag } from "./component.types";

export { BuyerItemEditor } from "./BuyerItemEditor";

function BuyerItemRowInner(props: {
  it: BuyerInboxRow;
  selected: boolean;
  inSheet?: boolean;
  m: LineMeta;
  sum: number;
  prettyText: string;
  rejectedByDirector: boolean;
  s: StylesBag;
  onTogglePick: () => void;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  counterpartyLabel: string;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onPickSupplier: (name: string) => void;
  showInlineEditor?: boolean;
  onFocusField?: () => void;
  onEditMobile?: () => void;
  isMobileEditorOpen?: boolean;
}) {
  const {
    it,
    selected,
    inSheet,
    m,
    sum,
    prettyText,
    rejectedByDirector,
    onTogglePick,
    counterpartyLabel,
    showInlineEditor = false,
    onEditMobile,
    isMobileEditorOpen,
    s,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const { user: noteUser } = splitNote(m.note);

  const rejectReason = String(
    it.director_reject_reason ??
    it.director_reject_note ??
    "",
  ).trim();
  const lastOfferSupplier = String(it.last_offer_supplier ?? "").trim();
  const lastOfferPriceRaw = it.last_offer_price;
  const lastOfferPrice =
    typeof lastOfferPriceRaw === "number" && Number.isFinite(lastOfferPriceRaw)
      ? lastOfferPriceRaw
      : null;

  const isEditing = selected && !showInlineEditor && !!isMobileEditorOpen;
  const statusLabel = isEditing ? "Редактируется" : selected ? "Выбрано" : "Заполни и выбери";
  const statusTone = selected ? "info" : "neutral";

  return (
    <View
      style={[
        inSheet ? s.buyerMobCard : s.card,
        inSheet ? null : { backgroundColor: P.cardBg, borderColor: P.border },
        selected && (inSheet ? s.buyerMobCardPicked : s.cardPicked),
        styles.rowShellBase,
        selected ? styles.rowShellSelected : styles.rowShellDefault,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderMain}>
            <View style={styles.rowHeaderTitleRow}>
              <Text style={[s.cardTitle, { color: P.text }]}>{it.name_human}</Text>

              {it.app_code ? (
                <View style={[styles.appCodeChip, { backgroundColor: P.chipGrayBg }]}>
                  <Text style={[styles.appCodeChipText, { color: P.chipGrayText }]}>
                    {it.app_code}
                  </Text>
                </View>
              ) : null}

              {rejectedByDirector ? (
                <View
                  style={[
                    styles.rejectedBadge,
                    {
                      backgroundColor: inSheet ? "rgba(239,68,68,0.18)" : "#FEE2E2",
                      borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                    },
                  ]}
                >
                  <Text style={[styles.rejectedBadgeText, { color: inSheet ? "#FCA5A5" : "#991B1B" }]}>
                    ОТКЛОНЕНА
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[s.cardMeta, { color: P.sub }]}>{prettyText}</Text>
          </View>

          <View style={styles.rowHeaderActions}>
            <Pressable
              testID={`buyer-item-toggle-${String(it.request_item_id ?? "")}`}
              accessibilityLabel={`buyer-item-toggle-${String(it.request_item_id ?? "")}`}
              onPress={onTogglePick}
              style={[
                s.smallBtn,
                {
                  borderColor: selected ? "#2563eb" : P.btnBorder,
                  backgroundColor: selected ? "#2563eb" : P.btnBg,
                },
                styles.toggleButton,
              ]}
            >
              <Text style={[s.smallBtnText, { color: selected ? "#fff" : P.text }]}>
                {selected ? "Снять" : "Выбрать"}
              </Text>
            </Pressable>
            {!selected ? <Ionicons name="chevron-forward" size={16} color={P.sub} /> : null}
          </View>
        </View>

        <View style={styles.rowMetaBlock}>
          <Text style={[styles.rowMetaText, { color: P.sub }]}>
            Цена: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{m.price || "?"}</Text>
            {" • "}
            {counterpartyLabel}: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{m.supplier || "?"}</Text>
            {" • "}
            Прим.: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{noteUser || "?"}</Text>
          </Text>

          <Text style={[styles.rowMetaText, { color: P.sub }]}>
            Сумма по позиции:{" "}
            <Text style={[styles.rowMetaStrong, { color: P.text }]}>{sum ? sum.toLocaleString() : "0"}</Text> сом
          </Text>

          {rejectedByDirector ? (
            <View
              style={[
                styles.rejectReasonCard,
                {
                  borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                  backgroundColor: inSheet ? "rgba(239,68,68,0.12)" : "#FEF2F2",
                },
              ]}
            >
              <Text style={[styles.rejectReasonText, { color: inSheet ? "#FCA5A5" : "#991B1B" }]}>
                Причина отклонения:{" "}
                <Text style={[styles.rejectReasonStrong, { color: inSheet ? "#FECACA" : "#7F1D1D" }]}>
                  {rejectReason || "Отклонено директором"}
                </Text>
              </Text>
              <Text style={[styles.rejectReasonSubline, { color: inSheet ? "#FECACA" : "#7F1D1D" }]}>
                Предыдущее предложение: {lastOfferSupplier || "?"} • {lastOfferPrice != null ? `${lastOfferPrice}` : "?"} сом
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rowFooter}>
          {selected ? (
            <Pressable
              onPress={onEditMobile}
              style={styles.mobileEditButton}
            >
              <Text style={styles.mobileEditButtonText}>Редактировать</Text>
            </Pressable>
          ) : null}

          <View style={styles.statusBadgeWrap}>
            <StatusBadge label={statusLabel} tone={statusTone} compact />
          </View>
        </View>
      </View>
    </View>
  );
}

export const BuyerItemRow = React.memo(BuyerItemRowInner, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.inSheet === next.inSheet &&
    prev.sum === next.sum &&
    prev.prettyText === next.prettyText &&
    prev.rejectedByDirector === next.rejectedByDirector &&
    prev.counterpartyLabel === next.counterpartyLabel &&
    prev.hasAnyCounterpartyOptions === next.hasAnyCounterpartyOptions &&
    prev.counterpartyHardFailure === next.counterpartyHardFailure &&
    prev.showInlineEditor === next.showInlineEditor &&
    prev.isMobileEditorOpen === next.isMobileEditorOpen &&
    prev.it?.request_item_id === next.it?.request_item_id &&
    prev.it?.name_human === next.it?.name_human &&
    prev.it?.qty === next.it?.qty &&
    prev.it?.uom === next.it?.uom &&
    prev.it?.app_code === next.it?.app_code &&
    prev.m?.price === next.m?.price &&
    prev.m?.supplier === next.m?.supplier &&
    prev.m?.note === next.m?.note &&
    prev.s === next.s &&
    prev.supplierSuggestions === next.supplierSuggestions
  );
});

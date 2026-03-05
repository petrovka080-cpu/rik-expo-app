import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeRuText } from "../../../lib/text/encoding";
import type { IssuedItemRow, LinkedReqCard } from "../types";

type IssuedStyles = {
  workModalSectionBtn: any;
  workModalSectionBtnTop12: any;
  workModalSectionTitle: any;
  workModalLinkedReqCard: any;
  workModalLinkedReqTitle: any;
  workModalLinkedReqMeta: any;
  workModalEmptyText: any;
  workModalHintMeta: any;
  workModalIssuedCard: any;
  workModalIssuedTitle: any;
  workModalIssuedMeta: any;
};

type Props = {
  issuedOpen: boolean;
  onToggle: () => void;
  loadingIssued: boolean;
  linkedReqCards: LinkedReqCard[];
  issuedItems: IssuedItemRow[];
  issuedHint: string;
  styles: IssuedStyles;
};

export default function IssuedSection(props: Props) {
  return (
    <>
      <Pressable
        onPress={props.onToggle}
        style={[props.styles.workModalSectionBtn, props.styles.workModalSectionBtnTop12]}
      >
        <Text style={props.styles.workModalSectionTitle}>Выдачи со склада</Text>
        <Ionicons name={props.issuedOpen ? "chevron-down" : "chevron-forward"} size={18} color="#64748B" />
      </Pressable>

      {props.issuedOpen && (
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          {props.loadingIssued && <ActivityIndicator size="small" />}

          {!props.loadingIssued && props.linkedReqCards.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {props.linkedReqCards.map((card) => (
                <View key={card.request_id} style={props.styles.workModalLinkedReqCard}>
                  <Text style={props.styles.workModalLinkedReqTitle}>{normalizeRuText(card.req_no)}</Text>
                  <Text style={props.styles.workModalLinkedReqMeta}>Статус: {normalizeRuText(card.status || "—")}</Text>
                  <Text style={props.styles.workModalLinkedReqMeta}>
                    Номера выдач: {card.issue_nos.length ? card.issue_nos.map((x) => normalizeRuText(x)).join(", ") : "нет выдач"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!props.loadingIssued && props.issuedItems.length === 0 && (
            <Text style={props.styles.workModalEmptyText}>
              По этой работе еще не подтверждены выдачи материалов.
            </Text>
          )}

          {!props.loadingIssued && !!props.issuedHint && (
            <Text style={[props.styles.workModalLinkedReqMeta, props.styles.workModalHintMeta]}>
              {normalizeRuText(props.issuedHint)}
            </Text>
          )}

          {props.issuedItems.map((it) => (
            <View key={it.issue_item_id} style={props.styles.workModalIssuedCard}>
              <Text style={props.styles.workModalIssuedTitle}>{normalizeRuText(it.title)}</Text>
              <Text style={props.styles.workModalIssuedMeta}>
                Выдано: {Number(it.qty || 0).toLocaleString("ru-RU")} {normalizeRuText(it.unit || "—")} · Остаток:{" "}
                {Number(it.qty_left || 0).toLocaleString("ru-RU")} {normalizeRuText(it.unit || "—")}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

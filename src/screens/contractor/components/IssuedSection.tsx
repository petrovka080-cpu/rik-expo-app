import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeRuText } from "../../../lib/text/encoding";
import type { WarehouseIssuesPanelState } from "../../../lib/api/contractor.scope.service";
import { StatusBadge } from "../../../ui/StatusBadge";

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
  state: WarehouseIssuesPanelState;
  styles: IssuedStyles;
};

export default function IssuedSection(props: Props) {
  const linkedRequestCards =
    props.state.status === "ready" || props.state.status === "empty" || props.state.status === "error"
      ? props.state.linkedRequestCards
      : [];

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
          {props.state.status === "loading" ? <ActivityIndicator size="small" /> : null}

          {linkedRequestCards.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {linkedRequestCards.map((card) => (
                <View key={card.requestId} style={props.styles.workModalLinkedReqCard}>
                  <Text style={props.styles.workModalLinkedReqTitle}>{normalizeRuText(card.reqNo)}</Text>
                  <StatusBadge label={`Статус: ${normalizeRuText(card.status || "—")}`} tone="neutral" compact />
                  <Text style={props.styles.workModalLinkedReqMeta}>
                    Номера выдач: {card.issueNos.length ? card.issueNos.map((value) => normalizeRuText(value)).join(", ") : "нет выдач"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {props.state.status === "ready"
            ? props.state.rows.map((item) => (
                <View key={item.issueItemId} style={props.styles.workModalIssuedCard}>
                  <Text style={props.styles.workModalIssuedTitle}>{normalizeRuText(item.title)}</Text>
                  <Text style={props.styles.workModalIssuedMeta}>
                    Выдано: {Number(item.qty || 0).toLocaleString("ru-RU")} {normalizeRuText(item.unit || "—")} ·
                    Остаток: {Number(item.qtyLeft || 0).toLocaleString("ru-RU")} {normalizeRuText(item.unit || "—")}
                  </Text>
                </View>
              ))
            : null}

          {props.state.status === "empty" ? (
            <Text style={props.styles.workModalEmptyText}>{normalizeRuText(props.state.message)}</Text>
          ) : null}

          {props.state.status === "error" ? (
            <Text style={[props.styles.workModalLinkedReqMeta, props.styles.workModalHintMeta]}>
              {normalizeRuText(props.state.message)}
            </Text>
          ) : null}
        </View>
      )}
    </>
  );
}

import React from "react";
import { View, Text, Pressable } from "react-native";

import type { ProposalHeadLite } from "../buyer.types";
import { UI } from "../buyerUi";
import { Chip } from "./common/Chip";
import type { StylesBag } from "./component.types";
import { statusColors } from "./statusColors";

export const BuyerProposalCard = React.memo(function BuyerProposalCard(props: {
  head: ProposalHeadLite;
  title?: string;
  s: StylesBag;
  attCount?: number | null;
  onOpenPdf: (pidStr: string) => void;
  onOpenAccounting: (pidStr: string) => void;
  onOpenRework: (pidStr: string) => void;
  onOpenDetails: (pidStr: string) => void;
  onOpenAttachments: (pidStr: string) => void;
}) {
  const { head, s, onOpenPdf, onOpenAccounting, onOpenRework, onOpenDetails, onOpenAttachments } = props;

  const pidStr = String(head.id);
  const sc = statusColors(head.status);
  const headerText = props.title || `Предложение #${pidStr.slice(0, 8)}`;

  return (
    <View style={s.proposalCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={[s.cardTitle, { color: UI.text }]}>{headerText}</Text>
        <Chip label={String(head.status || "—")} bg={sc.bg} fg={sc.fg} />

        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={s.sumPillText}>
            Сумма: {Number(head.total_sum ?? 0).toLocaleString()} сом
          </Text>
        </View>

        <Text style={[s.cardMeta, { color: "rgba(255,255,255,0.78)" }]}>
          {head.submitted_at ? new Date(head.submitted_at).toLocaleString() : "—"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
        <Pressable onPress={() => onOpenDetails(pidStr)} style={[s.openBtn, { minWidth: 120 }]} hitSlop={10}>
          <Text style={s.openBtnText}>Открыть</Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => onOpenPdf(pidStr)} style={[s.openBtn, { minWidth: 82 }]} hitSlop={10}>
            <Text style={s.openBtnText}>PDF</Text>
          </Pressable>

          <Pressable onPress={() => onOpenAttachments(pidStr)} style={[s.openBtn, { minWidth: 150 }]} hitSlop={10}>
            <Text style={s.openBtnText}>
              Вложения{typeof props.attCount === "number" ? ` (${props.attCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      {head.status === "Утверждено" && !head.sent_to_accountant_at ? (
        <View style={{ marginTop: 10 }}>
          <Pressable
            onPress={() => onOpenAccounting(pidStr)}
            style={[s.smallBtn, { backgroundColor: "#2563eb", borderColor: "#2563eb" }]}
            hitSlop={10}
          >
            <Text style={[s.smallBtnText, { color: "#fff" }]}>В бухгалтерию</Text>
          </Pressable>
        </View>
      ) : null}

      {String(head.status).startsWith("На доработке") ? (
        <View style={{ marginTop: 10 }}>
          <Pressable
            onPress={() => onOpenRework(pidStr)}
            style={[s.smallBtn, { backgroundColor: "#f97316", borderColor: "#f97316" }]}
            hitSlop={10}
          >
            <Text style={[s.smallBtnText, { color: "#fff" }]}>Доработать</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});


import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeRuText } from "../../../lib/text/encoding";
import type { WorkLogRow } from "../types";

type HistoryStyles = {
  workModalSectionBtn: any;
  workModalSectionTitle: any;
  workModalListCard: any;
  workModalEmptyText: any;
  workModalRowDivider: any;
  workModalLogDateText: any;
  workModalLogStageText: any;
  workModalLogCommentText: any;
  workModalInlineBtn: any;
  workModalInlineBtnText: any;
};

type Props = {
  historyOpen: boolean;
  onToggle: () => void;
  workLog: WorkLogRow[];
  fallbackUom: string;
  onOpenPdf: (log: WorkLogRow) => void;
  getVisibleNote: (note: string | null | undefined) => string;
  styles: HistoryStyles;
};

export default function ActsHistorySection(props: Props) {
  return (
    <>
      <Pressable onPress={props.onToggle} style={props.styles.workModalSectionBtn}>
        <Text style={props.styles.workModalSectionTitle}>История актов</Text>
        <Ionicons name={props.historyOpen ? "chevron-down" : "chevron-forward"} size={18} color="#64748B" />
      </Pressable>
      {props.historyOpen && (
        <View style={props.styles.workModalListCard}>
          {props.workLog.length === 0 && (
            <Text style={props.styles.workModalEmptyText}>
              Пока нет зафиксированных актов по этой работе.
            </Text>
          )}

          {props.workLog.map((log) => {
            const dt = new Date(log.created_at).toLocaleString("ru-RU");
            const unit = normalizeRuText(log.work_uom || props.fallbackUom || "");
            return (
              <View key={log.id} style={props.styles.workModalRowDivider}>
                <Text style={props.styles.workModalLogDateText}>
                  {dt} · {log.qty} {unit}
                </Text>

                {log.stage_note && (
                  <Text style={props.styles.workModalLogStageText}>
                    Этап: {normalizeRuText(log.stage_note)}
                  </Text>
                )}

                {log.note && (
                  <Text style={props.styles.workModalLogCommentText}>
                    Комментарий: {normalizeRuText(props.getVisibleNote(log.note))}
                  </Text>
                )}

                <Pressable
                  onPress={() => props.onOpenPdf(log)}
                  style={props.styles.workModalInlineBtn}
                >
                  <Text style={props.styles.workModalInlineBtnText}>PDF этого акта</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

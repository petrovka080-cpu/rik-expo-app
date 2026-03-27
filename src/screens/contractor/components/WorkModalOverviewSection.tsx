import React from "react";
import { Pressable, Text, View } from "react-native";
import { normalizeRuText } from "../../../lib/text/encoding";

type OverviewStyles = {
  workModalInfoCard: any;
  workModalInfoText: any;
  workModalWorkCard: any;
  workModalWorkTitle: any;
  workModalObjectText: any;
  workModalObjectTextError: any;
  workModalObjectLabel: any;
  workModalActions: any;
  workModalMainActionBtn: any;
  workModalMainActionBtnDisabled: any;
  workModalSecondaryActionBtn: any;
  workModalActionText: any;
  workModalHintText: any;
};

type Props = {
  workName: string;
  workCode: string;
  resolvedObjectName: string;
  resolvedObjectInfo: string;
  contractorOrg: string;
  contractorInn: string;
  contractorPhone: string;
  contractNumber: string;
  contractDate: string;
  contractorRep: string;
  zone: string;
  levelName: string;
  unitPrice: string;
  workModalSaving: boolean;
  loadingIssued: boolean;
  workModalHint: string;
  progressSyncLabel: string;
  progressSyncDetail: string | null;
  progressSyncTone: "neutral" | "info" | "success" | "warning" | "danger";
  canSubmitProgress: boolean;
  canRetryProgress: boolean;
  onSubmitProgress: () => void;
  onRetryProgress: () => void;
  onOpenContract: () => void;
  onOpenActBuilder: () => void;
  onOpenSummaryPdf: () => void;
  styles: OverviewStyles;
};

const statusColorMap: Record<Props["progressSyncTone"], string> = {
  neutral: "#64748b",
  info: "#0284c7",
  success: "#166534",
  warning: "#b45309",
  danger: "#b91c1c",
};

export default function WorkModalOverviewSection(props: Props) {
  const contractorOrg = normalizeRuText(props.contractorOrg);
  const contractorRep = normalizeRuText(props.contractorRep);
  const workName = normalizeRuText(props.workName);
  const workCode = normalizeRuText(props.workCode);
  const objectInfo = normalizeRuText(props.resolvedObjectInfo);
  const objectName = normalizeRuText(props.resolvedObjectName);

  return (
    <>
      <View style={props.styles.workModalInfoCard}>
        <Text style={props.styles.workModalInfoText}>
          {`${contractorOrg} · ИНН ${props.contractorInn} · ${props.contractorPhone}`}
        </Text>
        <Text style={props.styles.workModalInfoText}>
          {`Договор ${props.contractNumber} ${props.contractDate}`.trim()}
          {contractorRep ? ` · ${contractorRep}` : ""}
        </Text>
        <Text style={props.styles.workModalInfoText}>
          {`Объект: ${objectInfo} · Зона/этаж: ${props.zone} / ${props.levelName} · Цена/ед: ${props.unitPrice}`}
        </Text>
        <Pressable onPress={props.onOpenContract} style={{ marginTop: 6, alignSelf: "flex-start" }}>
          <Text style={{ color: "#0284c7", fontSize: 12, fontWeight: "700" }}>Подробнее</Text>
        </Pressable>
      </View>

      <View style={props.styles.workModalWorkCard}>
        <Text style={props.styles.workModalWorkTitle}>
          {workName || workCode || "Работа"}
        </Text>

        <Text style={[props.styles.workModalObjectText, !objectName && props.styles.workModalObjectTextError]}>
          <Text style={props.styles.workModalObjectLabel}>Объект: </Text>
          {objectName || "Объект не указан (проверьте привязку)."}
        </Text>
      </View>

      <View style={props.styles.workModalActions}>
        <View
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: "#fff",
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: statusColorMap[props.progressSyncTone] }}>
            {props.progressSyncLabel}
          </Text>
          {props.progressSyncDetail ? (
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {normalizeRuText(props.progressSyncDetail)}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={props.onSubmitProgress}
              disabled={!props.canSubmitProgress || props.workModalSaving || props.loadingIssued}
              style={[
                props.styles.workModalMainActionBtn,
                (!props.canSubmitProgress || props.workModalSaving || props.loadingIssued) &&
                  props.styles.workModalMainActionBtnDisabled,
              ]}
            >
              <Text style={props.styles.workModalActionText}>
                {props.workModalSaving ? "Сохранение..." : "Сохранить факт"}
              </Text>
            </Pressable>

            {props.canRetryProgress ? (
              <Pressable onPress={props.onRetryProgress} style={props.styles.workModalSecondaryActionBtn}>
                <Text style={props.styles.workModalActionText}>Повторить</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={props.onOpenActBuilder}
          disabled={props.workModalSaving || props.loadingIssued}
          style={[
            props.styles.workModalMainActionBtn,
            (props.workModalSaving || props.loadingIssued) && props.styles.workModalMainActionBtnDisabled,
          ]}
        >
          <Text style={props.styles.workModalActionText}>
            Сформировать акт выполненных работ
          </Text>
        </Pressable>
        <Pressable onPress={props.onOpenSummaryPdf} style={props.styles.workModalSecondaryActionBtn}>
          <Text style={props.styles.workModalActionText}>Итоговый PDF</Text>
        </Pressable>
        {!!props.workModalHint && (
          <Text style={props.styles.workModalHintText}>
            {normalizeRuText(props.workModalHint)}
          </Text>
        )}
      </View>
    </>
  );
}

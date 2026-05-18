import { Text, View } from "react-native";

import { styles } from "./ForemanAiQuickModal.styles";

export const cardStyle = styles.card;

export const normalizeComparableMessage = (value: string): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const KIND_LABELS: Record<string, string> = {
  material: "Материал",
  work: "Работа",
  service: "Услуга",
};

const getKindLabel = (value: string): string => KIND_LABELS[value] || value || "Позиция";

export const renderMetaLine = (params: { qty?: number; unit?: string | null; kind?: string | null; code?: string | null }) =>
  [
    params.qty != null ? `${params.qty} ${params.unit || ""}`.trim() : params.unit || null,
    params.kind ? getKindLabel(params.kind) : null,
    params.code || null,
  ]
    .filter(Boolean)
    .join(" • ");

export const toSelectorToken = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const NoticeCard = ({
  backgroundColor,
  borderColor,
  titleColor,
  title,
  detail,
}: {
  backgroundColor: string;
  borderColor: string;
  titleColor: string;
  title: string;
  detail?: string | null;
}) => (
  <View
    style={[styles.noticeCard, { backgroundColor, borderColor }]}
  >
    <Text style={[styles.noticeTitle, { color: titleColor }]}>{title}</Text>
    {detail ? (
      <Text style={[styles.noticeDetail, { color: titleColor }]}>
        {detail}
      </Text>
    ) : null}
  </View>
);

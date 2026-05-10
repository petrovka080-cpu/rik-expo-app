import React from "react";
import { Text, View } from "react-native";
import ActBuilderSelectionStats from "./ActBuilderSelectionStats";

type JobHeaderLike = {
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  zone?: string | null;
  level_name?: string | null;
  unit_price?: number | null;
};

type Props = {
  jobHeader: JobHeaderLike | null;
  resolvedObjectName: string;
  selectedWorkCount: number;
  selectedMatCount: number;
  matSum: number;
  actDateText: string;
};

function ActBuilderHeaderInfo(props: Props) {
  return (
    <View
      style={{
        marginTop: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        padding: 10,
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 12, color: "#334155" }}>
        {props.jobHeader?.contractor_org || "—"} · ИНН {props.jobHeader?.contractor_inn || "—"} · {" "}
        {props.jobHeader?.contractor_phone || "—"}
      </Text>
      <Text style={{ fontSize: 12, color: "#334155" }}>
        Договор № {props.jobHeader?.contract_number || "—"} от {props.jobHeader?.contract_date || "—"}
      </Text>
      <Text style={{ fontSize: 12, color: "#334155" }}>
        Объект: {props.resolvedObjectName || "—"} · Зона/этаж: {props.jobHeader?.zone || "—"} / {" "}
        {props.jobHeader?.level_name || "—"}
      </Text>
      <Text style={{ fontSize: 12, color: "#334155" }}>
        Цена/ед:{" "}
        {props.jobHeader?.unit_price == null ? "—" : Number(props.jobHeader.unit_price).toLocaleString("ru-RU")} ·
        {" "}Дата акта: {props.actDateText}
      </Text>
      <ActBuilderSelectionStats
        selectedWorkCount={props.selectedWorkCount}
        selectedMatCount={props.selectedMatCount}
        matSum={props.matSum}
      />
      <Text style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: "700" }}>
        Работы по подряду
      </Text>
    </View>
  );
}

export default React.memo(ActBuilderHeaderInfo);

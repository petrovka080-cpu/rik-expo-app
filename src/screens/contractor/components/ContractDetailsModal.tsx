import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

type JobHeaderLike = {
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  contract_number?: string | null;
  contract_date?: string | null;
  work_type?: string | null;
  zone?: string | null;
  level_name?: string | null;
  unit_price?: number | null;
  total_price?: number | null;
  date_start?: string | null;
  date_end?: string | null;
};

type WorkRowLike = {
  work_name?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  jobHeader: JobHeaderLike | null;
  workModalRow: WorkRowLike | null;
  resolvedObjectName: string;
};

export default function ContractDetailsModal(props: Props) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.45)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            maxHeight: "80%",
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 10 }}>Детали договора</Text>
          <ScrollView>
            <Text>Организация: {props.jobHeader?.contractor_org || "—"}</Text>
            <Text>ИНН: {props.jobHeader?.contractor_inn || "—"}</Text>
            <Text>Телефон: {props.jobHeader?.contractor_phone || "—"}</Text>
            <Text>Договор № {props.jobHeader?.contract_number || "—"} от {props.jobHeader?.contract_date || "—"}</Text>
            <Text>Объект: {props.resolvedObjectName || "—"}</Text>
            <Text>
              Работа: {props.jobHeader?.work_type || props.workModalRow?.work_name || "—"} · Зона/этаж: {props.jobHeader?.zone || "—"} /{" "}
              {props.jobHeader?.level_name || "—"}
            </Text>
            <Text>
              Цена/ед:{" "}
              {props.jobHeader?.unit_price == null ? "—" : Number(props.jobHeader.unit_price).toLocaleString("ru-RU")}
              {" · "}Сумма:{" "}
              {props.jobHeader?.total_price == null ? "—" : Number(props.jobHeader.total_price).toLocaleString("ru-RU")}
            </Text>
            <Text>
              Сроки: {props.jobHeader?.date_start || "—"} — {props.jobHeader?.date_end || "—"}
            </Text>
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
            <Pressable
              onPress={props.onClose}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#cbd5e1",
              }}
            >
              <Text style={{ color: "#334155", fontWeight: "600" }}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

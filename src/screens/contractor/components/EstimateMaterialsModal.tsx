import React from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkMaterialsEditor, type WorkMaterialRow } from "../../../components/WorkMaterialsEditor";
import { FlashList } from "../../../ui/FlashList";

type Props = {
  visible: boolean;
  onClose: () => void;
  sheetHeaderTopPad: number;
  workModalMaterials: WorkMaterialRow[];
  setWorkModalMaterials: React.Dispatch<React.SetStateAction<WorkMaterialRow[]>>;
  workModalReadOnly: boolean;
  workSearchVisible: boolean;
  workSearchQuery: string;
  handleWorkSearchChange: (txt: string) => void;
  workSearchResults: WorkMaterialRow[];
  renderWorkSearchItem: ({ item }: { item: WorkMaterialRow }) => React.ReactElement;
  onOpenSearch: () => void;
  closeSearch: () => void;
};

export default function EstimateMaterialsModal(props: Props) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.45)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            maxHeight: "85%",
            backgroundColor: "#fff",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            paddingHorizontal: 12,
            paddingTop: props.sheetHeaderTopPad,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>Материалы / сопутствующие позиции</Text>
            <Pressable onPress={props.onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <WorkMaterialsEditor
            rows={props.workModalMaterials}
            onChange={(nextRows) => props.setWorkModalMaterials(nextRows)}
            onAdd={props.onOpenSearch}
            onRemove={(idx) =>
              props.setWorkModalMaterials((prev) => prev.filter((_, i) => i !== idx))
            }
            readOnly={props.workModalReadOnly}
          />

          {props.workSearchVisible && !props.workModalReadOnly && (
            <View
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fff",
                gap: 8,
              }}
            >
              <Text style={{ fontWeight: "600" }}>Поиск материала по каталогу</Text>
              <TextInput
                value={props.workSearchQuery}
                onChangeText={props.handleWorkSearchChange}
                placeholder="Поиск по названию или коду..."
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              />
              <FlashList
                data={props.workSearchResults}
                keyExtractor={(m: WorkMaterialRow) => String(m.mat_code)}
                style={{ maxHeight: 220 }}
                estimatedItemSize={62}
                renderItem={props.renderWorkSearchItem}
                ListEmptyComponent={<Text style={{ color: "#94a3b8" }}>Введите минимум 2 символа для поиска.</Text>}
              />
              <Pressable
                onPress={props.closeSearch}
                style={{
                  alignSelf: "flex-end",
                  marginTop: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text>Закрыть поиск</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

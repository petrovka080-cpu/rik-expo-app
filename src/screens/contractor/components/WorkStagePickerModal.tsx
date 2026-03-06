import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

type StageOption = {
  code: string;
  name: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  sheetHeaderTopPad: number;
  workStageOptions: StageOption[];
  renderWorkStageItem: ({ item }: { item: StageOption }) => React.ReactElement;
};

export default function WorkStagePickerModal(props: Props) {
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
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 16,
            paddingTop: props.sheetHeaderTopPad,
            paddingBottom: 16,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            maxHeight: "60%",
          }}
        >
          <Text
            style={{
              fontWeight: "800",
              fontSize: 16,
              marginBottom: 8,
            }}
          >
            Выбор этапа работ
          </Text>

          <FlatList
            data={props.workStageOptions}
            keyExtractor={(s, index) => `${s.code}-${index}`}
            style={{ maxHeight: "80%" }}
            renderItem={props.renderWorkStageItem}
            ListEmptyComponent={
              <Text style={{ color: "#64748b" }}>
                Этапы еще не настроены. Добавьте строки в таблицу work_stages.
              </Text>
            }
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={props.onClose}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
            >
              <Text>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

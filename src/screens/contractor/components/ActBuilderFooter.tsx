import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props = {
  saving: boolean;
  hint: string;
  hasSelected: boolean;
  canSubmit?: boolean;
  onSubmit: () => void;
};

function ActBuilderFooter(props: Props) {
  return (
    <View style={{ padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
      <Pressable
        onPress={props.onSubmit}
        disabled={props.saving}
        style={{
          height: 54,
          borderRadius: 12,
          backgroundColor: props.canSubmit === false ? "#94a3b8" : "#0f172a",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
        }}
      >
        {props.saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Сформировать акт (PDF)</Text>
        )}
      </Pressable>
      {!!props.hint ? (
        <Text style={{ textAlign: "center", color: "#0369a1", fontSize: 11, marginTop: 8 }}>
          {props.hint}
        </Text>
      ) : !props.hasSelected ? (
        <Text style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, marginTop: 8 }}>
          Выберите работы или материалы для продолжения
        </Text>
      ) : null}
    </View>
  );
}

export default React.memo(ActBuilderFooter);

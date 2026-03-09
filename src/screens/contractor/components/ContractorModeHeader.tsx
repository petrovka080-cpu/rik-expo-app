import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  listMode: "home" | "subcontracts" | "others";
  onBackHome: () => void;
  styles: any;
};

export default function ContractorModeHeader(props: Props) {
  const { listMode, onBackHome, styles } = props;
  const title = listMode === "home" ? "Подрядчик" : listMode === "subcontracts" ? "Подряды" : "Другие";
  return (
    <View style={styles.homeHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={[styles.headerTitle, styles.homeHeaderTitle]}>{title}</Text>
        {listMode !== "home" ? (
          <Pressable style={styles.modeHeaderClose} onPress={onBackHome}>
            <Text style={styles.modeHeaderCloseText}>x</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

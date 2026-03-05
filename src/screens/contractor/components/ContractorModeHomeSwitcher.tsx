import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  onOpenOthers: () => void;
  onOpenSubcontracts: () => void;
  styles: any;
};

export default function ContractorModeHomeSwitcher(props: Props) {
  const { onOpenOthers, onOpenSubcontracts, styles } = props;
  return (
    <View style={styles.modeHomeWrap}>
      <Pressable style={styles.modeBtn} onPress={onOpenOthers}>
        <Text style={styles.modeBtnText}>[ ДРУГИЕ ]</Text>
      </Pressable>
      <Pressable style={styles.modeBtn} onPress={onOpenSubcontracts}>
        <Text style={styles.modeBtnText}>[ ПОДРЯДЫ ]</Text>
      </Pressable>
    </View>
  );
}

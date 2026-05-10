import React from "react";
import { Pressable, TextInput, View } from "react-native";
import Text from "./NormalizedText";
import { styles } from "../contractor.styles";

type Props = {
  code: string;
  activating: boolean;
  onCodeChange: (value: string) => void;
  onActivate: () => void;
  title: string;
  subtitle: string;
  placeholder: string;
  activateText: string;
  activatingText: string;
};

function ContractorActivationView({
  code,
  activating,
  onCodeChange,
  onActivate,
  title,
  subtitle,
  placeholder,
  activateText,
  activatingText,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Text style={{ marginTop: 12, fontSize: 14 }}>{subtitle}</Text>

      <TextInput
        placeholder={placeholder}
        value={code}
        onChangeText={onCodeChange}
        style={styles.input}
      />

      <Pressable onPress={onActivate} disabled={activating} style={styles.activateBtn}>
        <Text style={styles.activateText}>
          {activating ? activatingText : activateText}
        </Text>
      </Pressable>
    </View>
  );
}

export default React.memo(ContractorActivationView);

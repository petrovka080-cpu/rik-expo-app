import React from "react";
import { ActivityIndicator, View } from "react-native";
import Text from "./NormalizedText";
import { styles } from "../contractor.styles";

type Props = {
  text: string;
};

function ContractorLoadingView({ text }: Props) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text>{text}</Text>
    </View>
  );
}

export default React.memo(ContractorLoadingView);

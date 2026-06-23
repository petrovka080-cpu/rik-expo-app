import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  queued: boolean;
  completed: boolean;
};

export function MobilePhotoUploadStatus({ queued, completed }: Props): React.ReactElement | null {
  if (!queued && !completed) return null;
  return (
    <View style={styles.wrap} testID="mobile-photo-upload-status">
      <Text style={styles.text}>
        {completed
          ? "\u0424\u043e\u0442\u043e \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043e."
          : "\u0424\u043e\u0442\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e \u0438 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043e."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
  },
  text: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "800",
  },
});

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onRestore: () => void;
};

export function MobilePhotoRecoveryBanner({ visible, onRestore }: Props): React.ReactElement | null {
  if (!visible) return null;
  return (
    <View style={styles.wrap} testID="mobile-photo-recovery-banner">
      <Text style={styles.text}>{"\u041d\u0430\u0439\u0434\u0435\u043d \u043d\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043d\u044b\u0439 \u0441\u043d\u0438\u043c\u043e\u043a."}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0441\u043d\u0438\u043c\u043e\u043a"
        onPress={onRestore}
        style={styles.button}
        testID="mobile-photo-restore-pending"
      >
        <Text style={styles.buttonText}>{"\u0412\u0435\u0440\u043d\u0443\u0442\u044c"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
  },
  text: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
  },
  button: {
    minHeight: 32,
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: "#92400E",
    paddingHorizontal: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});

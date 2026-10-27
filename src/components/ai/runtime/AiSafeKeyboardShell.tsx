import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type AiSafeKeyboardShellProps = {
  children?: React.ReactNode;
  composer: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  composerContainerStyle?: StyleProp<ViewStyle>;
};

export function AiSafeKeyboardShell({
  children,
  composer,
  testID = "ai.screen.keyboard.shell",
  style,
  contentContainerStyle,
  composerContainerStyle,
}: AiSafeKeyboardShellProps): React.ReactElement {
  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[styles.root, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        testID="ai.screen.keyboard.scroll"
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <View
        testID="ai.screen.composer.target"
        collapsable={false}
        style={[styles.composerContainer, composerContainerStyle]}
      >
        {composer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 12,
    gap: 10,
  },
  composerContainer: {
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
  },
});

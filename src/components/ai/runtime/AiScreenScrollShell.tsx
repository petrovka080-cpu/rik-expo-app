import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

export type AiScreenScrollShellProps = {
  children?: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footerContainerStyle?: StyleProp<ViewStyle>;
};

export function AiScreenScrollShell({
  children,
  footer,
  testID = "ai.screen.scroll.shell",
  edges = ["top", "bottom"],
  style,
  contentContainerStyle,
  footerContainerStyle,
}: AiScreenScrollShellProps): React.ReactElement {
  return (
    <SafeAreaView testID={testID} style={[styles.safe, style]} edges={edges}>
      <ScrollView
        testID="ai.screen.scroll"
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View testID="ai.screen.scroll.footer" style={[styles.footer, footerContainerStyle]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
  footer: {
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
  },
});

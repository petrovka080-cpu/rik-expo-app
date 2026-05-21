import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export type AppSheetProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppSheet({ children, style }: AppSheetProps): React.ReactElement {
  return (
    <View testID="app.sheet" style={style}>
      {children}
    </View>
  );
}

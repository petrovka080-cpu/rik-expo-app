import React from "react";
import { ActivityIndicator, Animated, Text, View, type ViewStyle } from "react-native";

import WarehouseHeader from "./components/WarehouseHeader";
import WarehouseModalsManager from "./components/WarehouseModalsManager";
import WarehouseTabContent from "./components/WarehouseTabContent";
import { useWarehouseScreenController } from "./hooks/useWarehouseScreenController";
import {
  selectWarehouseHeaderProps,
  selectWarehouseScreenMode,
  selectWarehouseScreenStateText,
} from "./warehouse.screen.selectors";
import { UI, s } from "./warehouse.styles";

const ROOT_STYLE = { flex: 1, backgroundColor: UI.bg };
const SCREEN_STYLE = { flex: 1 };
const CONTENT_STYLE = { flex: 1, paddingHorizontal: 12 };
const LOADER_STYLE = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
} as const;
const WEB_STICKY_HEADER_STYLE = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  overflow: "hidden",
} as unknown as ViewStyle;

type WarehouseScreenContentProps = {
  entryKind?: "office" | "tab";
  entryExtra?: Record<string, unknown>;
};

export default function WarehouseScreenContent({
  entryKind: _entryKind = "tab",
  entryExtra: _entryExtra,
}: WarehouseScreenContentProps) {
  const vm = useWarehouseScreenController();
  const screenMode = selectWarehouseScreenMode(vm);
  const headerProps = selectWarehouseHeaderProps(vm);
  const screenStateText = selectWarehouseScreenStateText(screenMode);

  return (
    <View style={ROOT_STYLE}>
      <Animated.View
        pointerEvents="auto"
        style={[
          s.collapsingHeader,
          vm.isWeb ? WEB_STICKY_HEADER_STYLE : null,
          {
            height: vm.headerHeight,
            transform: vm.isWeb ? [{ translateY: vm.headerTranslateY }] : undefined,
            shadowOpacity: vm.headerShadowSafe,
            elevation: 6,
          },
        ]}
      >
        <WarehouseHeader {...headerProps} />
      </Animated.View>

      <View style={SCREEN_STYLE}>
        {screenMode === "loading" ? (
          <View style={LOADER_STYLE}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8, color: UI.sub }}>{screenStateText.title}</Text>
          </View>
        ) : screenMode === "fio_gate" ? (
          <View style={[LOADER_STYLE, { paddingHorizontal: 40 }]}>
            <Text style={{ color: UI.text, fontSize: 18, fontWeight: "900", textAlign: "center" }}>
              {screenStateText.title}
            </Text>
            <Text style={{ color: UI.sub, fontSize: 14, marginTop: 12, textAlign: "center" }}>
              {screenStateText.subtitle}
            </Text>
          </View>
        ) : (
          <View style={CONTENT_STYLE}>
            <WarehouseTabContent {...vm.tabContentProps} />
          </View>
        )}
      </View>

      <WarehouseModalsManager {...vm.modalsManagerProps} />
    </View>
  );
}

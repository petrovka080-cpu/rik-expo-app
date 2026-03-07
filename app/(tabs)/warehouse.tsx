import React from "react";
import { View, Text, ActivityIndicator, Animated, type ViewStyle } from "react-native";
import { UI, s } from "../../src/screens/warehouse/warehouse.styles";
import WarehouseHeader from "../../src/screens/warehouse/components/WarehouseHeader";
import WarehouseModalsManager from "../../src/screens/warehouse/components/WarehouseModalsManager";
import WarehouseTabContent from "../../src/screens/warehouse/components/WarehouseTabContent";
import { useWarehouseScreenController } from "../../src/screens/warehouse/hooks/useWarehouseScreenController";

const ROOT_STYLE = { flex: 1, backgroundColor: UI.bg };
const SCREEN_STYLE = { flex: 1 };
const CONTENT_STYLE = { flex: 1, paddingHorizontal: 12 };
const LOADER_STYLE = { flex: 1, alignItems: "center", justifyContent: "center" } as const;
const WEB_STICKY_HEADER_STYLE = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  overflow: "hidden",
} as unknown as ViewStyle;

export default function Warehouse() {
  const vm = useWarehouseScreenController();

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
        <WarehouseHeader
          tab={vm.tab}
          onTab={vm.onTabChange}
          incomingCount={vm.incomingCount}
          stockCount={vm.stockCount}
          titleSize={vm.titleSize}
          warehousemanFio={vm.warehousemanFio}
          onOpenFioModal={vm.onOpenFioModal}
        />
      </Animated.View>

      <View style={SCREEN_STYLE}>
        {vm.loading ? (
          <View style={LOADER_STYLE}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8, color: UI.sub }}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..."}</Text>
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

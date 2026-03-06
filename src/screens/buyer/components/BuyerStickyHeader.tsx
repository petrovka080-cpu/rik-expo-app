import React from "react";
import { Animated, Platform, View } from "react-native";

import { UI } from "../buyerUi";

export const BuyerStickyHeader = React.memo(function BuyerStickyHeader(props: {
  header: React.ReactNode;
  onHeaderMeasure: (height: number) => void;
  headerHeight: Animated.AnimatedInterpolation<string | number>;
  headerShadow: Animated.AnimatedInterpolation<string | number>;
}) {
  const { header, onHeaderMeasure, headerHeight, headerShadow } = props;

  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 }}
        onLayout={(e) => {
          const h = Math.round(e?.nativeEvent?.layout?.height ?? 0);
          onHeaderMeasure(h);
        }}
      >
        {header}
      </View>

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: headerHeight,
          backgroundColor: UI.cardBg,
          borderBottomWidth: 1,
          borderColor: UI.border,
          paddingTop: Platform.OS === "web" ? 10 : 12,
          paddingBottom: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 14,
          shadowOpacity: headerShadow,
          elevation: 6,
        }}
      >
        {header}
      </Animated.View>
    </>
  );
});


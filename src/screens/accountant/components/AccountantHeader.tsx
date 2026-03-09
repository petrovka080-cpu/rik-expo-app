import React, { memo } from "react";
import { Animated, Platform } from "react-native";
import Header from "./Header";
import type { Tab } from "../types";
import { UI } from "../ui";

type AccountantHeaderProps = {
    headerHeight: Animated.AnimatedInterpolation<number>;
    headerShadow: Animated.AnimatedInterpolation<number>;
    titleSize: Animated.AnimatedInterpolation<number>;
    subOpacity: Animated.AnimatedInterpolation<number>;
    tab: Tab;
    setTab: (t: Tab) => void;
    unread: number;
    rowsCount: number;
    accountantFio: string;
    onOpenFioModal: () => void;
    onBell: () => void;
    onExcel: () => void;
};

export const AccountantHeader = memo(function AccountantHeader({
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    tab,
    setTab,
    unread,
    rowsCount,
    accountantFio,
    onOpenFioModal,
    onBell,
    onExcel,
}: AccountantHeaderProps) {
    return (
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
                paddingBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 14,
                shadowOpacity: headerShadow,
                elevation: 6,
            }}
        >
            <Header
                tab={tab}
                setTab={setTab}
                unread={unread}
                titleSize={titleSize}
                subOpacity={subOpacity}
                rowsCount={rowsCount}
                onExcel={onExcel}
                onBell={onBell}
                onTabPress={() => { }}
                accountantFio={accountantFio}
                onOpenFioModal={onOpenFioModal}
            />
        </Animated.View>
    );
});

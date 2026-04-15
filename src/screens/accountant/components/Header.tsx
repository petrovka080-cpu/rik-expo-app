import React from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import type { Tab } from "../types";
import { TABS } from "../types";
import { UI } from "../ui";
import { SafeView } from "../helpers";
import { officeRoleChrome, useIsOfficeRoute } from "../../office/officeRoleChrome";
import TopRightActionBar from "../../../ui/TopRightActionBar";
import { Ionicons } from "@expo/vector-icons";

export default function Header({
  tab,
  setTab,
  unread,
  titleSize,
  subOpacity,
  rowsCount,
  onExcel,
  onBell,
  onTabPress,
  accountantFio,
  onOpenFioModal,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  unread: number;
  titleSize: number | Animated.AnimatedInterpolation<number>;
  subOpacity: number | Animated.AnimatedInterpolation<number>;
  rowsCount: number;
  onExcel: () => void;
  onBell: () => void;
  onTabPress: (t: Tab) => void;
  accountantFio?: string;
  onOpenFioModal?: () => void;
}) {
  const isOfficeRoute = useIsOfficeRoute();

  return (
    <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
      <SafeView style={{ flexDirection: "row", alignItems: "center" }}>
        <View>
          {!isOfficeRoute ? (
            <Animated.Text style={{ fontSize: titleSize, fontWeight: "600", color: UI.text }}>
              Бухгалтер
            </Animated.Text>
          ) : null}
          {!!accountantFio && (
            <Pressable onPress={onOpenFioModal}>
              <Text style={officeRoleChrome.roleMetaText}>
                {accountantFio}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ marginLeft: "auto" }}>
          <TopRightActionBar
            titleLeft=""
            actions={[
              {
                key: "excel",
                icon: "grid-outline" as keyof typeof Ionicons.glyphMap,
                onPress: onExcel,
                ariaLabel: "Excel",
              },
              {
                key: "bell",
                icon: "notifications-outline" as keyof typeof Ionicons.glyphMap,
                onPress: onBell,
                ariaLabel: "Уведомления",
              },
            ]}
            ui={{
              text: UI.text,
              sub: UI.sub,
              border: "rgba(255,255,255,0.14)",
              btnBg: UI.btnNeutral,
            }}
          />
        </View>
      </SafeView>

      {unread > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 6,
            right: 10,
            backgroundColor: "#ef4444",
            borderRadius: 999,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 10 }}>{unread}</Text>
        </View>
      ) : null}

      <View style={officeRoleChrome.switcherShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[officeRoleChrome.switcherRow, { paddingVertical: 2 }]}
        >
          <View style={{ flexDirection: "row" }}>
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <View key={t} style={{ marginRight: 8 }}>
                  <Pressable
                    onPress={() => {
                      setTab(t);
                      onTabPress(t);
                    }}
                    style={{
                      height: 36,
                      paddingHorizontal: 14,
                      borderRadius: 18,
                      backgroundColor: active ? UI.tabActiveBg : "rgba(255,255,255,0.04)",
                      borderWidth: 1,
                      borderColor: active ? UI.accent : "rgba(255,255,255,0.10)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: active ? UI.tabActiveText : UI.tabInactiveText, fontWeight: "600", fontSize: 13 }}>
                      {t}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Animated.View style={{ opacity: subOpacity, marginTop: 10 }}>
        {tab === "История" ? (
          <Text style={{ color: UI.sub, fontWeight: "500" }}>Фильтры истории ниже в списке</Text>
        ) : (
          <Text style={{ color: UI.sub, fontWeight: "500" }}>
            {rowsCount} документов • обновляй свайпом вниз
          </Text>
        )}
      </Animated.View>
    </SafeView>
  );
}

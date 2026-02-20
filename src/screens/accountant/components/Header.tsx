import React from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import type { Tab } from "../types";
import { TABS } from "../types";
import { UI } from "../ui";
import { SafeView } from "../helpers";
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
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  unread: number;
  titleSize: any;
  subOpacity: any;
  rowsCount: number;
  onExcel: () => void;
  onBell: () => void;
  onTabPress: (t: Tab) => void;
}) {
  return (
    <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
      {/* TOP ROW */}
      <SafeView style={{ flexDirection: "row", alignItems: "center" }}>
        <Animated.Text style={{ fontSize: titleSize as any, fontWeight: "900", color: UI.text }}>
          Бухгалтер
        </Animated.Text>

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

      {/* unread badge — поверх, чтобы логику не трогать */}
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
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}>{unread}</Text>
        </View>
      ) : null}

      <SafeView style={{ height: 10 }} />

      {/* TABS */}
      <View style={{ marginTop: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
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
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: active ? UI.tabActiveBg : UI.tabInactiveBg,
                      borderWidth: 1,
                      borderColor: active ? UI.accent : "rgba(255,255,255,0.14)",
                    }}
                  >
                    <Text style={{ color: active ? UI.tabActiveText : UI.tabInactiveText, fontWeight: "800" }}>
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
          <Text style={{ color: UI.sub, fontWeight: "800" }}>Фильтры истории ниже в списке</Text>
        ) : (
          <Text style={{ color: UI.sub, fontWeight: "800" }}>
            {rowsCount} документов • обновляй свайпом вниз
          </Text>
        )}
      </Animated.View>
    </SafeView>
  );
}


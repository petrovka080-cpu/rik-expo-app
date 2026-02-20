import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Tab } from "../types";
import { TABS } from "../types";
import { UI } from "../ui";

export default function TabsBar({
  tab,
  onPressTab,
}: {
  tab: Tab;
  onPressTab: (t: Tab) => void;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => onPressTab(t)}
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
          );
        })}
      </ScrollView>
    </View>
  );
}

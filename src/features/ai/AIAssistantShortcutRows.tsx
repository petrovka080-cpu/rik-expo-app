import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { AssistantContext, AssistantQuickPrompt } from "./assistant.types";
import { getAssistantContextLabel } from "./assistantPrompts";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";

export function AIAssistantShortcutRows({
  assistantContext,
  quickPrompts,
  onPromptPress,
}: {
  assistantContext: AssistantContext;
  quickPrompts: AssistantQuickPrompt[];
  onPromptPress: (prompt: string) => void;
}) {
  return (
    <>
      <ScrollView
        horizontal
        style={styles.routeScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.routeRow}
      >
        {assistantContext !== "unknown" ? (
          <View style={styles.routeChip}>
            <Text style={styles.routeChipText}>{getAssistantContextLabel(assistantContext)}</Text>
          </View>
        ) : null}
        <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/market")}>
          <Text style={styles.routeChipText}>Маркет</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/supplierShowcase")}>
          <Text style={styles.routeChipText}>Витрина</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/supplierMap")}>
          <Text style={styles.routeChipText}>Карта</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/auctions")}>
          <Text style={styles.routeChipText}>Торги</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/profile")}>
          <Text style={styles.routeChipText}>Профиль</Text>
        </Pressable>
      </ScrollView>

      <ScrollView
        horizontal
        style={styles.quickPromptScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickPromptRow}
      >
        {quickPrompts.map((prompt) => (
          <Pressable key={prompt.id} style={styles.quickPromptChip} onPress={() => onPromptPress(prompt.prompt)}>
            <Text style={styles.quickPromptText}>{prompt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

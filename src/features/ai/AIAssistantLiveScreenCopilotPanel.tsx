import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { AssistantContext } from "./assistant.types";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";
import {
  buildAiLiveScreenButtonClickPayload,
  listAiLiveScreenButtonsForScreen,
  listAiLiveScreenManifests,
  resolveAiLiveScreenId,
} from "../../lib/ai/liveScreenCopilot";

export function AIAssistantLiveScreenCopilotPanel({
  assistantContext,
  onReadyProposalPress,
}: {
  assistantContext: AssistantContext;
  onReadyProposalPress: (text: string) => void;
}) {
  const liveScreenId = resolveAiLiveScreenId(assistantContext);
  const liveManifest = listAiLiveScreenManifests().find((manifest) => manifest.screenId === liveScreenId) ?? null;
  if (!liveManifest) return null;

  return (
    <View style={styles.roleAssistantBlock} testID="ai.live_screen_copilot.block">
      <View style={styles.roleAssistantHeaderRow}>
        <Text style={styles.roleAssistantEyebrow}>Готово от AI</Text>
        <Text style={styles.roleAssistantDomain}>{liveManifest.titleRu.replace("Готово от AI · ", "")}</Text>
      </View>
      <Text style={styles.roleAssistantSummary}>{liveManifest.userGoalRu}</Text>
      <ScrollView
        horizontal
        style={styles.roleAssistantActionScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roleAssistantActionRow}
      >
        {listAiLiveScreenButtonsForScreen(liveManifest.screenId).slice(0, 7).map((button) => (
          <Pressable
            key={button.id}
            style={styles.roleAssistantActionChip}
            onPress={() => onReadyProposalPress(buildAiLiveScreenButtonClickPayload(button))}
            testID="ai.live_screen_copilot.action"
            accessibilityRole="button"
            accessibilityLabel={button.labelRu}
          >
            <Text style={styles.roleAssistantActionText}>{button.labelRu}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

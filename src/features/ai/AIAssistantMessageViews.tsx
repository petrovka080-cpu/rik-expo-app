import React, { type MutableRefObject } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RequestEstimateLaunchPayloadV1 } from "../../lib/navigation/requestEstimateLaunchPayload";
import { AIAssistantEstimatePdfActions, AIAssistantEstimateTable } from "./AIAssistantEstimatePdfActions";
import { acknowledgeAiUiLaunch } from "./AIAssistantLaunchRuntime";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";
import { recordAssistantScreenFallback } from "./AIAssistantScreen.helpers";
import type { AssistantMessage } from "./assistant.types";

export function AIAssistantBootView() {
  return (
    <SafeAreaView testID="ai.assistant.screen" style={styles.bootContainer} edges={["top", "bottom"]}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.bootText}>Загружаем AI-ассистента...</Text>
    </SafeAreaView>
  );
}

export function AIAssistantMessageList({
  messages,
  hasAnyUserPrompt,
  autoEstimateLaunchPayloadRef,
  onAppendMessage,
}: {
  messages: AssistantMessage[];
  hasAnyUserPrompt: boolean;
  autoEstimateLaunchPayloadRef: MutableRefObject<RequestEstimateLaunchPayloadV1 | null>;
  onAppendMessage: (message: AssistantMessage) => void;
}) {
  return messages.map((message, index) => {
    const hasPriorUserPrompt = messages
      .slice(0, index)
      .some((historyMessage) => historyMessage.role === "user");
    const isLatestAssistantReply =
      message.role === "assistant" && hasPriorUserPrompt && index === messages.length - 1;
    const shouldCompactAssistantHistory =
      message.role === "assistant" && hasAnyUserPrompt && !isLatestAssistantReply;
    const responseTestId = isLatestAssistantReply
      ? "ai.assistant.response"
      : message.role === "assistant"
        ? "ai.assistant.response.history"
        : undefined;

    return (
      <React.Fragment key={message.id}>
        <View
          testID={responseTestId}
          style={[
            styles.messageBubble,
            message.role === "assistant" ? styles.assistantBubble : styles.userBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              message.role === "assistant" ? styles.assistantText : styles.userText,
            ]}
            numberOfLines={shouldCompactAssistantHistory ? 2 : undefined}
            ellipsizeMode="tail"
          >
            {message.content}
          </Text>
        </View>
        {message.role === "assistant" && message.estimatePdfSource ? (
          <AIAssistantEstimateTable source={message.estimatePdfSource} presentation={message.estimatePresentation} />
        ) : null}
        <AIAssistantEstimatePdfActions
          message={message}
          onAppendMessage={onAppendMessage}
          onFallback={recordAssistantScreenFallback}
        />
        {message.role === "assistant" &&
        message.estimatePdfSource &&
        isLatestAssistantReply ? (
          <View
            collapsable={false}
            style={styles.runtimeInlineMarker}
            onLayout={() => {
              const payload = autoEstimateLaunchPayloadRef.current;
              if (payload) acknowledgeAiUiLaunch(payload, "ai_estimate_projection");
            }}
          />
        ) : null}
      </React.Fragment>
    );
  });
}

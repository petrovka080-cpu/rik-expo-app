import { router } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  buildAiEstimatePdfConfirmation,
  generateAiEstimatePdf,
} from "../../lib/ai/estimatePdf";
import type { AiEstimatePdfSource } from "../../lib/ai/estimatePdf";
import type { AssistantMessage } from "./assistant.types";
import { createAssistantScreenMessage as createMessage } from "./AIAssistantScreen.helpers";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";

type Props = {
  message: AssistantMessage;
  onAppendMessage: (message: AssistantMessage) => void;
  onFallback: (event: string, error: unknown, extra?: Record<string, unknown>) => void;
};

const activeEstimatePdfCreations = new Set<string>();

function getEstimatePdfCreationKey(source: AiEstimatePdfSource) {
  return `${source.sourceType}:${source.sourceId ?? source.createdAt}:${source.title}`;
}

function openEstimatePdfResult(result: ReturnType<typeof generateAiEstimatePdf>) {
  router.push({
    pathname: "/pdf-viewer",
    params: {
      uri: result.access.uri,
      title: result.title,
      fileName: `${result.pdfId}.pdf`,
      sourceKind: result.access.kind === "signed-url" ? "remote-url" : result.access.kind,
      documentType: "request",
      originModule: "reports",
      source: "generated",
      entityId: result.pdfId,
    },
  });
}

export function AIAssistantEstimatePdfActions({
  message,
  onAppendMessage,
  onFallback,
}: Props) {
  const makeEstimatePdf = useCallback(
    (source: AiEstimatePdfSource) => {
      const confirmation = buildAiEstimatePdfConfirmation(source);
      const createPdf = () => {
        const creationKey = getEstimatePdfCreationKey(source);
        if (activeEstimatePdfCreations.has(creationKey)) return;
        activeEstimatePdfCreations.add(creationKey);
        try {
          const result = generateAiEstimatePdf({ source, userConfirmed: true });
          onAppendMessage(createMessage("assistant", `PDF создан: ${result.title}`));
          openEstimatePdfResult(result);
        } catch (error) {
          onFallback("make_estimate_pdf_failed", error, {
            action: "make_estimate_pdf",
            sourceType: source.sourceType,
          });
          onAppendMessage(createMessage("assistant", "Не удалось создать PDF по этой смете. Проверьте строки сметы и попробуйте снова."));
        } finally {
          activeEstimatePdfCreations.delete(creationKey);
        }
      };
      Alert.alert(confirmation.copy.title, confirmation.copy.body, [
        { text: confirmation.copy.cancelLabel, style: "cancel" },
        { text: confirmation.copy.createLabel, onPress: createPdf },
      ]);
    },
    [onAppendMessage, onFallback],
  );

  if (!message.estimatePdfSource || !message.actions?.length) return null;

  return (
    <View style={styles.estimateActionRow} testID="ai-estimate-actions">
      {message.actions.map((action) => (
        <Pressable
          key={`${message.id}:${action.id}`}
          testID={action.id === "make_estimate_pdf" ? "ai-estimate-make-pdf" : `ai-estimate-action-${action.id}`}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.estimateActionButton}
          onPress={() => {
            if (action.id === "make_estimate_pdf" && message.estimatePdfSource) {
              makeEstimatePdf(message.estimatePdfSource);
            }
          }}
        >
          <Text style={styles.estimateActionText} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

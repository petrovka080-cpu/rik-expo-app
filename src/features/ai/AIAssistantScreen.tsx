import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppChatComposerBar } from "../../components/layout/AppChatComposerBar";
import { AIAssistantLiveScreenCopilotPanel } from "./AIAssistantLiveScreenCopilotPanel";
import {
  AIAssistantProductHeader,
  AIAssistantReadyProductPanels,
  AIAssistantShortcutRows,
} from "./AIAssistantReadyProductPanels";
import { tryRunAssistantAction } from "./assistantActions";
import { loadAssistantScopedFacts, type AssistantScopedFacts } from "./assistantScopeContext";
import { sendAssistantMessage } from "./assistantClient";
import {
  getAssistantGreeting,
  normalizeAssistantRole,
} from "./assistantPrompts";
import { clearAssistantMessages, loadAssistantMessages, saveAssistantMessages } from "./assistantStorage";
import type { AssistantMessage, AssistantRole } from "./assistant.types";
import { sanitizeAssistantUserFacingCopy } from "./assistantUx/aiAssistantUserFacingCopyPolicy";
import { AIAssistantEstimatePdfActions, AIAssistantEstimateTable } from "./AIAssistantEstimatePdfActions";
import { answerResolvedLiveAiContext } from "../../lib/ai/liveUi";
import {
  answerAiLiveScreenButton,
  resolveAiLiveScreenConcreteQuestion,
  resolveAiLiveScreenId,
} from "../../lib/ai/liveScreenCopilot";
import {
  buildAiScreenMagicButtonResultCopy,
  buildAiScreenMagicFreeTextResultCopy,
  isAiScreenMagicClickPayload,
} from "./screenMagic/aiScreenMagicButtonResolver";
import { useAssistantVoiceInput } from "./useAssistantVoiceInput";
import { useAIAssistantScreenDerivedState } from "./useAIAssistantScreenDerivedState";
import { loadCurrentProfileIdentity } from "../profile/currentProfileIdentity";
import { safeBack } from "../../lib/navigation/safeBack";
import {
  createAssistantScreenMessage as createMessage,
  normalizeGroundedRouteParams,
  recordAssistantScreenFallback,
  resolveAssistantMessagesAfterHydration,
} from "./AIAssistantScreen.helpers";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";
import {
  createBuiltInAiAssistantMessage,
  createExternalKnowledgeAssistantMessage,
} from "./assistantAnswerPipeline";
import type { RequestEstimateLaunchPayloadV1 } from "../../lib/navigation/requestEstimateLaunchPayload";
import { recordRequestEstimateLaunchStage } from "../../lib/navigation/requestEstimateLaunchObservability";
import {
  markRequestEstimateIntentStage,
  requestEstimateIntentLifecycle,
} from "../../lib/navigation/requestEstimateLaunchLifecycle";

function markAiDraftSessionReady(
  payload: RequestEstimateLaunchPayloadV1,
): boolean {
  if (
    !markRequestEstimateIntentStage(payload.launchId, "DRAFT_SESSION_READY")
  ) {
    return false;
  }
  recordRequestEstimateLaunchStage({
    stage: "DRAFT_SESSION_READY",
    payload,
    detail: { adapter: "ai_assistant_estimate_pipeline" },
  });
  return true;
}

function acknowledgeAiUiLaunch(
  payload: RequestEstimateLaunchPayloadV1,
  projection: "ai_launch_projection" | "ai_estimate_projection",
): void {
  if (!markRequestEstimateIntentStage(payload.launchId, "UI_READY")) return;
  recordRequestEstimateLaunchStage({
    stage: "UI_READY",
    payload,
    detail: { projection },
  });
  if (
    !markRequestEstimateIntentStage(payload.launchId, "INTENT_ACKNOWLEDGED")
  ) {
    return;
  }
  recordRequestEstimateLaunchStage({
    stage: "INTENT_ACKNOWLEDGED",
    payload,
  });
}

function acknowledgeAiPromptLaunch(
  payload: RequestEstimateLaunchPayloadV1,
): void {
  if (!markAiDraftSessionReady(payload)) return;
  acknowledgeAiUiLaunch(payload, "ai_launch_projection");
}

function AIAssistantBootView() {
  return (
    <SafeAreaView testID="ai.assistant.screen" style={styles.bootContainer} edges={["top", "bottom"]}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.bootText}>Загружаем AI-ассистента...</Text>
    </SafeAreaView>
  );
}

function AIAssistantMessageList({
  messages,
  hasAnyUserPrompt,
  autoEstimateLaunchPayloadRef,
  onAppendMessage,
}: {
  messages: AssistantMessage[];
  hasAnyUserPrompt: boolean;
  autoEstimateLaunchPayloadRef: React.MutableRefObject<RequestEstimateLaunchPayloadV1 | null>;
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

function useAIAssistantLaunchRuntimeEffects({
  booting,
  effectiveLaunchPayload,
  launchAutoSend,
  launchPrompt,
  input,
  loading,
  messagesLength,
  send,
  setInput,
  handledPromptRef,
  acknowledgedPromptLaunchRef,
  messagesScrollRef,
}: {
  booting: boolean;
  effectiveLaunchPayload: RequestEstimateLaunchPayloadV1 | null;
  launchAutoSend: string | undefined;
  launchPrompt: string;
  input: string;
  loading: boolean;
  messagesLength: number;
  send: (textParam?: string) => Promise<void>;
  setInput: (value: string) => void;
  handledPromptRef: React.MutableRefObject<string>;
  acknowledgedPromptLaunchRef: React.MutableRefObject<string>;
  messagesScrollRef: React.MutableRefObject<ScrollView | null>;
}) {
  useEffect(() => {
    if (booting || !launchPrompt) return;

    const key = `${effectiveLaunchPayload?.launchId ?? "route"}::${launchPrompt}::${launchAutoSend === "1" ? "1" : "0"}`;
    if (handledPromptRef.current === key) return;
    handledPromptRef.current = key;

    if (launchAutoSend === "1") {
      const autoSendPayload = effectiveLaunchPayload;
      if (Platform.OS === "android" && autoSendPayload) {
        console.info(
          `[RikWarmDeepLink] AI_AUTO_SEND_STARTED ${JSON.stringify({
            launchId: autoSendPayload.launchId,
          })}`,
        );
      }
      void send(launchPrompt).then(() => {
        if (Platform.OS === "android" && autoSendPayload) {
          console.info(
            `[RikWarmDeepLink] AI_AUTO_SEND_RESOLVED ${JSON.stringify({
              launchId: autoSendPayload.launchId,
            })}`,
          );
        }
      });
      return;
    }

    setInput(launchPrompt);
  }, [
    booting,
    effectiveLaunchPayload,
    handledPromptRef,
    launchAutoSend,
    launchPrompt,
    send,
    setInput,
  ]);

  useEffect(() => {
    if (
      booting ||
      !effectiveLaunchPayload ||
      launchAutoSend === "1" ||
      input.trim() !== launchPrompt ||
      acknowledgedPromptLaunchRef.current === effectiveLaunchPayload.launchId
    ) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      acknowledgeAiPromptLaunch(effectiveLaunchPayload);
      acknowledgedPromptLaunchRef.current = effectiveLaunchPayload.launchId;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    acknowledgedPromptLaunchRef,
    booting,
    effectiveLaunchPayload,
    input,
    launchAutoSend,
    launchPrompt,
  ]);

  useEffect(() => {
    if (messagesLength === 0) return undefined;
    const timeout = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(timeout);
  }, [loading, messagesLength, messagesScrollRef]);
}

export default function AIAssistantScreen({
  launchPayload = null,
}: {
  launchPayload?: RequestEstimateLaunchPayloadV1 | null;
}) {
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AssistantRole>("unknown");
  const [fullName, setFullName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [scopedFacts, setScopedFacts] = useState<AssistantScopedFacts | null>(null);
  const [scopedFactsLoading, setScopedFactsLoading] = useState(false);
  const [scopedFactsError, setScopedFactsError] = useState<string | null>(null);
  const [runtimeLaunchPayload, setRuntimeLaunchPayload] =
    useState<RequestEstimateLaunchPayloadV1 | null>(launchPayload);
  const handledPromptRef = useRef<string>("");
  const acknowledgedPromptLaunchRef = useRef<string>("");
  const autoEstimateLaunchPayloadRef =
    useRef<RequestEstimateLaunchPayloadV1 | null>(null);
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const {
    params,
    routeContext,
    routePrompt,
    routeAutoSend,
    assistantContext,
    assistantPresentationRole,
    debugAiContext,
    resolvedUserContext,
    readyProposals,
    approvedSupplierBundle,
    readyBuyBundle,
    roleScreenAssistantPack,
    screenNativeAssistantPack,
    screenWorkflowPack,
    screenMagicPack,
    assistantFactsSummary,
    assistantVoiceScreen,
    quickPrompts,
    backFallbackRoute,
  } = useAIAssistantScreenDerivedState({ role, scopedFacts });
  const assistantVoice = useAssistantVoiceInput({
    screen: assistantVoiceScreen,
    value: input,
    onChangeText: setInput,
  });
  const initialize = useCallback(async (keepInteractive = false) => {
    if (!keepInteractive) setBooting(true);
    try {
      const identity = await loadCurrentProfileIdentity();
      const nextRole = normalizeAssistantRole(identity.role);
      const nextUserId = identity.userId;

      setRole(nextRole);
      setUserId(nextUserId);
      const nextFullName = identity.fullName;
      setFullName(nextFullName);
      const shouldRestoreStoredMessages = assistantContext === "unknown";
      const stored = shouldRestoreStoredMessages ? await loadAssistantMessages(nextUserId) : [];
      if (shouldRestoreStoredMessages && stored.length > 0) {
        setMessages((current) =>
          resolveAssistantMessagesAfterHydration(
            current,
            stored,
            keepInteractive,
          ),
        );
        setBooting(false);
        return;
      }
      const greetingRole = assistantContext === "unknown" ? nextRole : assistantPresentationRole;
      const greeting = createMessage(
        "assistant",
        getAssistantGreeting(greetingRole, nextFullName, assistantContext),
      );
      setMessages((current) =>
        resolveAssistantMessagesAfterHydration(
          current,
          [greeting],
          keepInteractive,
        ),
      );
    } catch (error) {
      recordAssistantScreenFallback("initialize_assistant_failed", error, {
        action: "initialize",
        assistantContext,
      });
      const greeting = createMessage(
        "assistant",
        getAssistantGreeting("unknown", null, assistantContext),
      );
      setMessages((current) =>
        resolveAssistantMessagesAfterHydration(
          current,
          [greeting],
          keepInteractive,
        ),
      );
    } finally {
      setBooting(false);
    }
  }, [assistantContext, assistantPresentationRole]);
  useEffect(() => {
    if (!launchPayload) return;
    setRuntimeLaunchPayload((current) => {
      if (current?.launchId === launchPayload.launchId) return current;
      if (
        current &&
        Date.parse(current.issuedAt) > Date.parse(launchPayload.issuedAt)
      ) {
        return current;
      }
      return launchPayload;
    });
  }, [launchPayload]);
  useEffect(() => {
    const syncPendingAiLaunch = () => {
      const pending = requestEstimateIntentLifecycle.getPending();
      if (
        pending?.target.payload.route !== "/ai" ||
        pending.stage === "INTENT_RECEIVED" ||
        pending.stage === "URL_PARSED" ||
        pending.stage === "AUTH_PENDING" ||
        pending.stage === "AUTH_RESOLVED"
      ) {
        return;
      }
      if (Platform.OS === "android") {
        console.info(
          `[RikWarmDeepLink] AI_RUNTIME_LAUNCH_SYNC ${JSON.stringify({
            launchId: pending.target.payload.launchId,
            autoSend: pending.target.payload.parameters.autoSend ?? null,
            stage: pending.stage,
          })}`,
        );
      }
      setRuntimeLaunchPayload((current) =>
        current?.launchId === pending.target.payload.launchId
          ? current
          : pending.target.payload,
      );
    };
    syncPendingAiLaunch();
    return requestEstimateIntentLifecycle.subscribe(syncPendingAiLaunch);
  }, []);
  const effectiveLaunchPayload = runtimeLaunchPayload ?? launchPayload;
  const launchPrompt = String(
    effectiveLaunchPayload?.workIntent || routePrompt || "",
  ).trim();
  const launchAutoSend =
    effectiveLaunchPayload?.parameters.autoSend ?? routeAutoSend;
  const hasInteractiveLaunchPrompt = Boolean(launchPrompt);
  const hasRouteAutoSendPrompt =
    routeAutoSend === "1" && hasInteractiveLaunchPrompt;
  const hasAutoSendPrompt =
    (launchAutoSend === "1" && hasInteractiveLaunchPrompt) ||
    hasRouteAutoSendPrompt;
  useFocusEffect(
    useCallback(() => {
      // The composer and canonical launch prompt do not depend on profile or
      // stored-message hydration. Keep the route interactive immediately and
      // hydrate identity/history in the background; auto-send still
      // acknowledges only after `send` resolves below.
      if (hasInteractiveLaunchPrompt) setBooting(false);
      if (hasAutoSendPrompt) {
        void initialize(hasAutoSendPrompt);
      } else {
        void initialize(hasInteractiveLaunchPrompt);
      }
    }, [hasAutoSendPrompt, hasInteractiveLaunchPrompt, initialize]),
  );
  useEffect(() => {
    if (assistantContext !== "unknown") return;
    if (!userId || messages.length === 0) return;
    void saveAssistantMessages(userId, messages);
  }, [assistantContext, messages, userId]);

  useEffect(() => {
    if (booting) return;
    let cancelled = false;
    setScopedFactsLoading(true);
    setScopedFactsError(null);
    void loadAssistantScopedFacts({
      role,
      context: assistantContext,
    })
      .then((nextFacts) => {
        if (cancelled) return;
        setScopedFacts(nextFacts);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setScopedFacts(null);
        recordAssistantScreenFallback("load_scoped_facts_failed", error, {
          action: "loadAssistantScopedFacts",
          assistantRole: role,
          assistantContext,
        });
        setScopedFactsError(error instanceof Error ? error.message : String(error ?? "load_failed"));
      })
      .finally(() => {
        if (!cancelled) setScopedFactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assistantContext, booting, role]);
  const send = useCallback(
    async (textParam?: string) => {
      const text = String(textParam ?? input).trim();
      if (!text || loading) return;
      const userMessage = createMessage("user", text);
      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setInput("");
      setLoading(true);
      try {
        const builtInAiMessage = createBuiltInAiAssistantMessage({
          text,
          assistantContext,
          routeContext,
          assistantPresentationRole,
          userId,
        });
        if (builtInAiMessage) {
          const autoEstimatePayload =
            effectiveLaunchPayload &&
            launchAutoSend === "1" &&
            text === launchPrompt &&
            builtInAiMessage.estimatePdfSource
              ? effectiveLaunchPayload
              : null;
          if (autoEstimatePayload) {
            autoEstimateLaunchPayloadRef.current = autoEstimatePayload;
            markAiDraftSessionReady(autoEstimatePayload);
          }
          setMessages((prev) => [...prev, builtInAiMessage]);
          return;
        }
        const externalKnowledgeMessage = createExternalKnowledgeAssistantMessage({
          text,
          assistantContext,
          routeContext,
          assistantPresentationRole,
          userId,
        });
        if (externalKnowledgeMessage) {
          setMessages((prev) => [...prev, externalKnowledgeMessage]);
          return;
        }
        const liveScreenButton = resolveAiLiveScreenConcreteQuestion({
          screenId: resolveAiLiveScreenId(assistantContext),
          buttonIdOrPayloadOrLabel: text,
        });
        if (liveScreenButton) {
          const liveAnswer = answerAiLiveScreenButton(liveScreenButton.button, {
            userId: userId ?? undefined,
            companyId: "company-scope",
            referenceDate: "2026-05-20",
          });
          setMessages((prev) => [...prev, createMessage("assistant", liveAnswer.presentedTextRu)]);
          return;
        }

        const liveAiResult = answerResolvedLiveAiContext({
          routeContext,
          assistantContext,
          userText: text,
        });
        if (liveAiResult.handled) {
          setMessages((prev) => [...prev, createMessage("assistant", liveAiResult.answer.answerTextRu)]);
          return;
        }
        if (String(routeContext || "").trim()) {
          setMessages((prev) => [...prev, createMessage("assistant", liveAiResult.exactReason)]);
          return;
        }

        if (isAiScreenMagicClickPayload(text) && screenMagicPack) {
          const buttonResult = buildAiScreenMagicButtonResultCopy({
            pack: screenMagicPack,
            buttonIdOrLabel: text,
          });
          if (buttonResult) {
            setMessages((prev) => [...prev, createMessage("assistant", buttonResult.answer)]);
            return;
          }
        }

        if (screenMagicPack) {
          const groundedResult = buildAiScreenMagicFreeTextResultCopy({
            pack: screenMagicPack,
            userText: text,
            routeParams: normalizeGroundedRouteParams(params),
          });
          setMessages((prev) => [...prev, createMessage("assistant", groundedResult.answer)]);
          return;
        }

        const actionResult = await tryRunAssistantAction({
          role,
          context: assistantContext,
          message: text,
        });
        const answer = actionResult.handled
          ? sanitizeAssistantUserFacingCopy(actionResult.reply || "Готово. Действия напрямую не выполняю без согласования.")
          : await sendAssistantMessage({
            role,
            context: assistantContext,
            message: text,
            history: nextHistory.filter((item) => item.role !== "user" || item.id !== userMessage.id),
            scopedFactsSummary: assistantFactsSummary,
            screenMagicPack,
            screenNativeAssistantPack,
            roleScreenAssistantPack,
            scopeKey: scopedFacts?.scopeKey ?? null,
            sourceKinds: scopedFacts?.sourceKinds ?? null,
            userId,
          });
        setMessages((prev) => [...prev, createMessage("assistant", answer)]);
      } catch (error) {
        const messageText =
          error instanceof Error && error.message.trim()
            ? sanitizeAssistantUserFacingCopy(error.message.trim())
            : "Не удалось выполнить действие. Попробуйте снова.";
        recordAssistantScreenFallback("send_message_failed", error, {
          action: "send",
          assistantRole: role,
          assistantContext,
        });
        setMessages((prev) => [...prev, createMessage("assistant", messageText)]);
      } finally {
        setLoading(false);
      }
    },
    [assistantContext, assistantFactsSummary, assistantPresentationRole, effectiveLaunchPayload, input, launchAutoSend, launchPrompt, loading, messages, params, role, roleScreenAssistantPack, routeContext, screenMagicPack, screenNativeAssistantPack, scopedFacts, userId],
  );

  const clearChat = useCallback(async () => {
    const greetingRole = assistantContext === "unknown" ? role : assistantPresentationRole;
    const greeting = createMessage("assistant", getAssistantGreeting(greetingRole, fullName, assistantContext));
    setMessages([greeting]);
    await clearAssistantMessages(userId);
  }, [assistantContext, assistantPresentationRole, fullName, role, userId]);

  useAIAssistantLaunchRuntimeEffects({
    booting,
    effectiveLaunchPayload,
    launchAutoSend,
    launchPrompt,
    input,
    loading,
    messagesLength: messages.length,
    send,
    setInput,
    handledPromptRef,
    acknowledgedPromptLaunchRef,
    messagesScrollRef,
  });

  if (booting) {
    return <AIAssistantBootView />;
  }

  const hasAnyUserPrompt = messages.some((candidate) => candidate.role === "user");
  const hasLatestAssistantReply =
    hasAnyUserPrompt &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant";
  return (
    <SafeAreaView testID="ai.assistant.screen" style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {hasLatestAssistantReply ? (
          <View testID="ai.assistant.response" style={styles.runtimeInlineMarker} />
        ) : null}
        <View style={styles.chatShell}>
          <AIAssistantProductHeader
            domain={resolvedUserContext.effectiveDomain}
            onBack={() => safeBack(router, backFallbackRoute)}
            onClear={() => void clearChat()}
          />

          <ScrollView
            ref={messagesScrollRef}
            testID="ai.assistant.messages"
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
          >
          <AIAssistantLiveScreenCopilotPanel
            assistantContext={assistantContext}
            onReadyProposalPress={(text) => void send(text)}
          />
          <AIAssistantReadyProductPanels
            resolvedUserContext={resolvedUserContext}
            readyProposals={readyProposals}
            screenNativeAssistantPack={screenNativeAssistantPack}
            screenWorkflowPack={screenWorkflowPack}
            roleScreenAssistantPack={roleScreenAssistantPack}
            readyBuyBundle={readyBuyBundle}
            approvedSupplierBundle={approvedSupplierBundle}
            debugAiContext={debugAiContext}
            scopedFacts={scopedFacts}
            scopedFactsError={scopedFactsError}
            scopedFactsLoading={scopedFactsLoading}
            onReadyProposalPress={(text) => isAiScreenMagicClickPayload(text) ? void send(text) : setInput(text)}
          />
          <AIAssistantShortcutRows
            assistantContext={assistantContext}
            quickPrompts={quickPrompts}
            onPromptPress={(prompt) => void send(prompt)}
          />

          <AIAssistantMessageList
            messages={messages}
            hasAnyUserPrompt={hasAnyUserPrompt}
            autoEstimateLaunchPayloadRef={autoEstimateLaunchPayloadRef}
            onAppendMessage={(nextMessage) => setMessages((prev) => [...prev, nextMessage])}
          />
          {loading ? (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]} testID="ai.assistant.loading" accessibilityLabel="AI assistant loading">
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingInlineText}>Думаю над ответом...</Text>
            </View>
          ) : null}
        </ScrollView>

        <AppChatComposerBar
          placeholderRu="Напишите вопрос..."
          canAttach
          canSend={Boolean(input.trim()) && !loading}
          safeAboveBottomNav
        >
        <View style={styles.composer}>
          <Pressable
            style={[
              styles.voiceButton,
              assistantVoice.isActive && styles.voiceButtonActive,
              !assistantVoice.supported && styles.voiceButtonMuted,
            ]}
            onPress={() => (assistantVoice.isActive ? assistantVoice.stop() : assistantVoice.start())}
            accessibilityRole="button"
            accessibilityLabel="assistant_voice_button"
            accessibilityHint="Вставляет распознанную речь в поле ввода без автосабмита"
            testID="assistant_voice_button"
          >
            <Ionicons
              name={assistantVoice.isActive ? "stop-circle" : "mic"}
              size={18}
              color={assistantVoice.isActive ? "#FFFFFF" : "#0F172A"}
            />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Спросите про маркет, склад, заявки, отчеты..."
            placeholderTextColor="#94A3B8"
            multiline
            style={styles.input}
            accessibilityLabel="ai.assistant.input"
            testID="ai.assistant.input"
          />
          <Pressable
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={() => void send()}
            disabled={!input.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="ai.assistant.send"
            testID="ai.assistant.send"
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        {assistantVoice.error || assistantVoice.status !== "ready" ? (
          <View style={styles.voiceStatusRow}>
            <Text style={[styles.voiceStatusText, assistantVoice.error ? styles.voiceStatusError : null]}>
              {assistantVoice.error
                ? assistantVoice.error
                : assistantVoice.status === "listening"
                  ? "Голосовой ввод слушает. Проверьте текст перед отправкой."
                  : assistantVoice.status === "recognizing"
                    ? "Голосовой ввод обрабатывает речь. Автоотправка отключена."
                    : assistantVoice.status === "denied"
                      ? "Доступ к микрофону не выдан. Остаётся текстовый ввод."
                      : assistantVoice.status === "unsupported"
                        ? "Голосовой ввод недоступен на этой платформе или в этой сборке."
                        : "Голосовой ввод завершился ошибкой. Остаётся текстовый ввод."}
            </Text>
          </View>
        ) : null}
        </AppChatComposerBar>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

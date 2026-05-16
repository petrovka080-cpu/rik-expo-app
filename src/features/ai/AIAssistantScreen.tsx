import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import {
  AIAssistantProductHeader,
  AIAssistantReadyProductPanels,
  AIAssistantShortcutRows,
} from "./AIAssistantReadyProductPanels";
import { tryRunAssistantAction } from "./assistantActions";
import { loadAssistantScopedFacts, type AssistantScopedFacts } from "./assistantScopeContext";
import { sendAssistantMessage } from "./assistantClient";
import {
  getAssistantContextQuickPrompts, getAssistantGreeting,
  getAssistantQuickPrompts, normalizeAssistantContext, normalizeAssistantRole,
} from "./assistantPrompts";
import { clearAssistantMessages, loadAssistantMessages, saveAssistantMessages } from "./assistantStorage";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";
import { resolveAssistantUserContext } from "./assistantUx/aiAssistantContextResolver";
import { sanitizeAssistantUserFacingCopy } from "./assistantUx/aiAssistantUserFacingCopyPolicy";
import { resolveAiScreenIdForAssistantContext } from "./context/aiScreenContext";
import {
  buildApprovedRequestBundleFromSearchParams,
} from "./procurement/aiApprovedRequestSupplierProposalHydrator";
import {
  describeProcurementReadyBuyOptionsForAssistant,
} from "./procurement/aiBuyerInboxReadyBuyOptions";
import {
  buildProcurementReadyBuyBundleFromSearchParams,
} from "./procurement/aiProcurementRequestOptionHydrator";
import { getAiRoleScreenAssistantPack } from "./realAssistants/aiRoleScreenAssistantEngine";
import { describeAiScreenNativeAssistantPack, getAiScreenNativeAssistantPack } from "./screenNative/aiScreenNativeAssistantEngine";
import { describeAiScreenWorkflowPack, getAiScreenWorkflowPack } from "./screenWorkflows/aiScreenWorkflowEngine";
import { getAiScreenReadyProposals } from "./screenProposals/aiScreenReadyProposalEngine";
import { useAssistantVoiceInput } from "./useAssistantVoiceInput";
import { loadCurrentProfileIdentity } from "../profile/currentProfileIdentity";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { OFFICE_TAB_ROUTE, PROFILE_TAB_ROUTE } from "../../lib/navigation/coreRoutes";
import { MARKET_TAB_ROUTE } from "../market/market.routes";
import { safeBack } from "../../lib/navigation/safeBack";
import { aiAssistantScreenStyles as styles } from "./AIAssistantScreen.styles";

const recordAssistantScreenFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "ai",
    surface: "assistant_screen",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "assistant_screen_failed"),
    extra: {
      module: "ai.AIAssistantScreen",
      route: "/ai",
      role: "ai",
      owner: "assistant_screen",
      severity: "error",
      ...extra,
    },
  });

function createMessage(role: AssistantMessage["role"], content: string): AssistantMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function resolveAssistantBackFallback(context: AssistantContext) {
  switch (context) {
    case "foreman":
    case "director":
    case "buyer":
    case "accountant":
    case "warehouse":
    case "contractor":
    case "security":
      return OFFICE_TAB_ROUTE;
    case "profile":
      return PROFILE_TAB_ROUTE;
    case "market":
    case "supplierMap":
    case "request":
    case "reports":
    case "unknown":
    default:
      return MARKET_TAB_ROUTE;
  }
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function booleanParam(value: string | string[] | undefined): boolean {
  const normalized = String(firstParam(value) || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default function AIAssistantScreen() {
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const routePrompt = firstParam(params.prompt);
  const routeAutoSend = firstParam(params.autoSend);
  const routeContext = firstParam(params.context);
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
  const handledPromptRef = useRef<string>("");
  const assistantContext = useMemo<AssistantContext>(() => normalizeAssistantContext(routeContext), [routeContext]);
  const debugAiContext = booleanParam(params.debugAiContext);
  const assistantScreenId = useMemo(
    () => resolveAiScreenIdForAssistantContext(assistantContext),
    [assistantContext],
  );
  const resolvedUserContext = useMemo(
    () =>
      resolveAssistantUserContext({
        urlContext: assistantContext,
        sessionRole: role,
        screenId: assistantScreenId,
      }),
    [assistantContext, assistantScreenId, role],
  );
  const readyProposals = useMemo(
    () =>
      getAiScreenReadyProposals({
        context: assistantContext,
        screenId: resolvedUserContext.screenId,
        limit: assistantContext === "buyer" ? 4 : 3,
      }),
    [assistantContext, resolvedUserContext.screenId],
  );
  const approvedSupplierBundle = useMemo(
    () => buildApprovedRequestBundleFromSearchParams(params),
    [params],
  );
  const readyBuyBundle = useMemo(
    () => buildProcurementReadyBuyBundleFromSearchParams(params),
    [params],
  );
  const readyBuyFactsSummary = useMemo(
    () => describeProcurementReadyBuyOptionsForAssistant(readyBuyBundle),
    [readyBuyBundle],
  );
  const roleScreenAssistantPack = useMemo(
    () => getAiRoleScreenAssistantPack({
      role,
      context: assistantContext,
      screenId: firstParam(params.screenId) || resolvedUserContext.screenId,
      searchParams: params,
      scopedFactsSummary: scopedFacts?.summary ?? null,
      readyBuyBundle,
    }),
    [assistantContext, params, readyBuyBundle, resolvedUserContext.screenId, role, scopedFacts?.summary],
  );
  const screenNativeAssistantPack = useMemo(
    () => getAiScreenNativeAssistantPack({
      role,
      context: assistantContext,
      screenId: firstParam(params.screenId) || resolvedUserContext.screenId,
      searchParams: params,
      scopedFactsSummary: scopedFacts?.summary ?? null,
      readyBuyBundle,
    }),
    [assistantContext, params, readyBuyBundle, resolvedUserContext.screenId, role, scopedFacts?.summary],
  );
  const screenNativeAssistantSummary = useMemo(
    () => describeAiScreenNativeAssistantPack(screenNativeAssistantPack),
    [screenNativeAssistantPack],
  );
  const screenWorkflowPack = useMemo(() => getAiScreenWorkflowPack({ role, context: assistantContext, screenId: firstParam(params.screenId) || resolvedUserContext.screenId, searchParams: params, scopedFactsSummary: scopedFacts?.summary ?? null }), [assistantContext, params, resolvedUserContext.screenId, role, scopedFacts?.summary]);
  const assistantFactsSummary = useMemo(
    () => [scopedFacts?.summary ?? null, readyBuyFactsSummary, screenNativeAssistantSummary, describeAiScreenWorkflowPack(screenWorkflowPack)].filter(Boolean).join("\n\n") || null,
    [readyBuyFactsSummary, screenNativeAssistantSummary, screenWorkflowPack, scopedFacts?.summary],
  );
  const assistantVoiceScreen = useMemo(
    () => (role === "buyer" || role === "director" || role === "foreman" ? role : null),
    [role],
  );

  const quickPrompts = useMemo(() => {
    const merged = [
      ...getAssistantContextQuickPrompts(assistantContext),
      ...getAssistantQuickPrompts(role),
    ];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [assistantContext, role]);
  const assistantVoice = useAssistantVoiceInput({
    screen: assistantVoiceScreen,
    value: input,
    onChangeText: setInput,
  });
  const backFallbackRoute = useMemo(
    () => resolveAssistantBackFallback(assistantContext),
    [assistantContext],
  );

  const initialize = useCallback(async () => {
    setBooting(true);
    try {
      const identity = await loadCurrentProfileIdentity();
      const nextRole = normalizeAssistantRole(identity.role);
      const nextUserId = identity.userId;

      setRole(nextRole);
      setUserId(nextUserId);
      const nextFullName = identity.fullName;
      setFullName(nextFullName);

      const stored = await loadAssistantMessages(nextUserId);
      if (stored.length > 0) {
        setMessages(stored);
        setBooting(false);
        return;
      }

      setMessages([createMessage("assistant", getAssistantGreeting(nextRole, nextFullName, assistantContext))]);
    } catch (error) {
      recordAssistantScreenFallback("initialize_assistant_failed", error, {
        action: "initialize",
        assistantContext,
      });
      setMessages([createMessage("assistant", getAssistantGreeting("unknown", null, assistantContext))]);
    } finally {
      setBooting(false);
    }
  }, [assistantContext]);

  useFocusEffect(
    useCallback(() => {
      void initialize();
    }, [initialize]),
  );

  useEffect(() => {
    if (!userId || messages.length === 0) return;
    void saveAssistantMessages(userId, messages);
  }, [messages, userId]);

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
    [assistantContext, assistantFactsSummary, input, loading, messages, role, roleScreenAssistantPack, screenNativeAssistantPack, scopedFacts, userId],
  );

  const clearChat = useCallback(async () => {
    const greeting = createMessage("assistant", getAssistantGreeting(role, fullName, assistantContext));
    setMessages([greeting]);
    await clearAssistantMessages(userId);
  }, [assistantContext, fullName, role, userId]);

  useEffect(() => {
    if (booting) return;
    const prompt = String(routePrompt || "").trim();
    if (!prompt) return;

    const key = `${prompt}::${routeAutoSend === "1" ? "1" : "0"}`;
    if (handledPromptRef.current === key) return;
    handledPromptRef.current = key;

    if (routeAutoSend === "1") {
      void send(prompt);
      return;
    }

    setInput(prompt);
  }, [booting, routeAutoSend, routePrompt, send]);

  if (booting) {
    return (
      <SafeAreaView testID="ai.assistant.screen" style={styles.bootContainer} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.bootText}>Загружаем AI-ассистента...</Text>
      </SafeAreaView>
    );
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
            scopeLabel={resolvedUserContext.userFacingScopeLabel}
            onBack={() => safeBack(router, backFallbackRoute)}
            onClear={() => void clearChat()}
          />

          <ScrollView testID="ai.assistant.messages" style={styles.messages} contentContainerStyle={styles.messagesContent}>
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
            onReadyProposalPress={setInput}
          />
          <AIAssistantShortcutRows
            assistantContext={assistantContext}
            quickPrompts={quickPrompts}
            onPromptPress={(prompt) => void send(prompt)}
          />

          {messages.map((message, index) => {
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
              <View
                key={message.id}
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
            );
          })}
          {loading ? (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]} testID="ai.assistant.loading" accessibilityLabel="AI assistant loading">
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingInlineText}>Думаю над ответом...</Text>
            </View>
          ) : null}
        </ScrollView>

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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

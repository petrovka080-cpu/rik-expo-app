import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supportsAssistantActionMode, tryRunAssistantAction } from "./assistantActions";
import { loadAssistantScopedFacts, type AssistantScopedFacts } from "./assistantScopeContext";
import { isAssistantConfigured, sendAssistantMessage } from "./assistantClient";
import {
  getAssistantContextLabel,
  getAssistantContextQuickPrompts,
  getAssistantGreeting,
  getAssistantQuickPrompts,
  normalizeAssistantContext,
  normalizeAssistantRole,
} from "./assistantPrompts";
import type { AssistantContext, AssistantMessage, AssistantRole } from "./assistant.types";
import { useAssistantVoiceInput } from "./useAssistantVoiceInput";
import { loadCurrentProfileIdentity } from "../profile/currentProfileIdentity";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

const STORAGE_PREFIX = "gox.ai.chat.v1";

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

function buildStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}:${userId || "anonymous"}`;
}

function getRoleLabel(role: AssistantRole): string {
  switch (role) {
    case "buyer":
      return "Снабженец";
    case "warehouse":
      return "Склад";
    case "director":
      return "Директор";
    case "accountant":
      return "Бухгалтер";
    case "foreman":
      return "Прораб";
    case "contractor":
      return "Подрядчик";
    case "security":
      return "Безопасность";
    default:
      return "Пользователь";
  }
}

export default function AIAssistantScreen() {
  const params = useLocalSearchParams<{
    prompt?: string | string[];
    autoSend?: string | string[];
    context?: string | string[];
  }>();
  const routePrompt = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;
  const routeAutoSend = Array.isArray(params.autoSend) ? params.autoSend[0] : params.autoSend;
  const routeContext = Array.isArray(params.context) ? params.context[0] : params.context;
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
  const assistantVoiceScreen = useMemo(
    () => (role === "buyer" || role === "director" || role === "foreman" ? role : null),
    [role],
  );

  const configured = isAssistantConfigured();
  const actionMode = useMemo(
    () => supportsAssistantActionMode(role, assistantContext),
    [assistantContext, role],
  );
  const modeLabel = configured ? (actionMode ? "action AI" : "online AI") : actionMode ? "local action mode" : "guide mode";
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

      const storageKey = buildStorageKey(nextUserId);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as AssistantMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setBooting(false);
          return;
        }
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
    void AsyncStorage.setItem(buildStorageKey(userId), JSON.stringify(messages.slice(-30)));
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
          ? actionResult.reply || "Действие выполнено."
          : await sendAssistantMessage({
            role,
            context: assistantContext,
            message: text,
            history: nextHistory.filter((item) => item.role !== "user" || item.id !== userMessage.id),
            scopedFactsSummary: scopedFacts?.summary ?? null,
            scopeKey: scopedFacts?.scopeKey ?? null,
            sourceKinds: scopedFacts?.sourceKinds ?? null,
            userId,
          });
        setMessages((prev) => [...prev, createMessage("assistant", answer)]);
      } catch (error) {
        const messageText =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
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
    [assistantContext, input, loading, messages, role, scopedFacts, userId],
  );

  const clearChat = useCallback(async () => {
    const greeting = createMessage("assistant", getAssistantGreeting(role, fullName, assistantContext));
    setMessages([greeting]);
    await AsyncStorage.removeItem(buildStorageKey(userId));
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
      <SafeAreaView style={styles.bootContainer} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.bootText}>Загружаем AI-ассистента...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>AI ассистент</Text>
            <Text style={styles.headerSubtitle}>
              {`${getRoleLabel(role)} • ${getAssistantContextLabel(assistantContext)} • ${
                modeLabel
              }`}
            </Text>
          </View>

          <Pressable style={styles.headerIconButton} onPress={() => void clearChat()}>
            <Ionicons name="refresh" size={18} color="#0F172A" />
          </Pressable>
        </View>

        {actionMode ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Операционный режим</Text>
            <Text style={styles.noticeText}>
              В этом контексте AI уже использует текущие app APIs для AI-заявки прораба, поиска по рынку и
              подбора вариантов для снабжения. Бизнес-логика документов и экранов при этом остается той же.
            </Text>
          </View>
        ) : null}

        <View style={[styles.noticeCard, actionMode && styles.noticeHidden]}>
          <Text style={styles.noticeTitle}>Безопасный режим</Text>
          <Text style={styles.noticeText}>
            Ассистент встроен в приложение как read-only помощник: он не меняет статусы, не создает документы и не
            трогает бизнес-логику за вас. Текущий модуль: {getAssistantContextLabel(assistantContext)}.
          </Text>
        </View>

        {scopedFactsLoading || scopedFacts || scopedFactsError ? (
          <View style={styles.scopeCard}>
            <View style={styles.scopeCardHeader}>
              <Text style={styles.scopeCardTitle}>Data-aware context</Text>
              {scopedFactsLoading ? <ActivityIndicator size="small" color="#2563EB" /> : null}
            </View>
            {scopedFacts ? (
              <>
                <Text style={styles.scopeCardText}>{scopedFacts.summary}</Text>
                <Text style={styles.scopeCardMeta}>
                  {`${scopedFacts.scopeKey} • ${scopedFacts.sourceKinds.join(", ")}`}
                </Text>
              </>
            ) : null}
            {!scopedFacts && scopedFactsError ? (
              <Text style={styles.scopeCardError}>
                {`Контекст не загружен: ${scopedFactsError}`}
              </Text>
            ) : null}
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeRow}>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptRow}>
          {quickPrompts.map((prompt) => (
            <Pressable key={prompt.id} style={styles.quickPromptChip} onPress={() => void send(prompt.prompt)}>
              <Text style={styles.quickPromptText}>{prompt.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.map((message) => (
            <View
              key={message.id}
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
              >
                {message.content}
              </Text>
            </View>
          ))}
          {loading ? (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
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
            accessibilityLabel="assistant_input"
            testID="assistant_input"
          />
          <Pressable
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={() => void send()}
            disabled={!input.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="assistant_send_button"
            testID="assistant_send_button"
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  bootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  bootText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  noticeText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#1E3A8A",
  },
  noticeHidden: {
    display: "none",
  },
  scopeCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scopeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scopeCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  scopeCardText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  scopeCardMeta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  scopeCardError: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
  },
  routeRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  routeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  routeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  quickPromptRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  quickPromptChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickPromptText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  messages: {
    flex: 1,
    marginTop: 10,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantText: {
    color: "#0F172A",
  },
  userText: {
    color: "#FFFFFF",
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingInlineText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  voiceButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  voiceButtonMuted: {
    opacity: 0.72,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    color: "#0F172A",
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  voiceStatusRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  voiceStatusText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
  },
  voiceStatusError: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});

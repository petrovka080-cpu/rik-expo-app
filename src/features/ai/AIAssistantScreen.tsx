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

import { getMyRole } from "../../lib/api/profile";
import { supabase } from "../../lib/supabaseClient";
import { supportsAssistantActionMode, tryRunAssistantAction } from "./assistantActions";
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

const STORAGE_PREFIX = "gox.ai.chat.v1";

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
  const handledPromptRef = useRef<string>("");
  const assistantContext = useMemo<AssistantContext>(() => normalizeAssistantContext(routeContext), [routeContext]);

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

  const initialize = useCallback(async () => {
    setBooting(true);
    try {
      const [roleValue, authResult] = await Promise.all([getMyRole(), supabase.auth.getUser()]);

      const nextRole = normalizeAssistantRole(roleValue);
      const nextUser = authResult.data.user ?? null;
      const nextUserId = nextUser?.id ?? null;

      setRole(nextRole);
      setUserId(nextUserId);

      let nextFullName: string | null = null;
      if (nextUserId) {
        const profileResult = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("user_id", nextUserId)
          .maybeSingle();
        nextFullName = profileResult.data?.full_name ?? null;
      }
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
    } catch {
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
          });
        setMessages((prev) => [...prev, createMessage("assistant", answer)]);
      } finally {
        setLoading(false);
      }
    },
    [assistantContext, input, loading, messages, role],
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeRow}>
          {assistantContext !== "unknown" ? (
            <View style={styles.routeChip}>
              <Text style={styles.routeChipText}>{getAssistantContextLabel(assistantContext)}</Text>
            </View>
          ) : null}
          <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/market" as any)}>
            <Text style={styles.routeChipText}>Маркет</Text>
          </Pressable>
          <Pressable style={styles.routeChip} onPress={() => router.push("/supplierShowcase" as any)}>
            <Text style={styles.routeChipText}>Витрина</Text>
          </Pressable>
          <Pressable style={styles.routeChip} onPress={() => router.push("/supplierMap" as any)}>
            <Text style={styles.routeChipText}>Карта</Text>
          </Pressable>
          <Pressable style={styles.routeChip} onPress={() => router.push("/auctions" as any)}>
            <Text style={styles.routeChipText}>Торги</Text>
          </Pressable>
          <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/profile" as any)}>
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
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Спросите про маркет, склад, заявки, отчеты..."
            placeholderTextColor="#94A3B8"
            multiline
            style={styles.input}
          />
          <Pressable
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={() => void send()}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
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
});

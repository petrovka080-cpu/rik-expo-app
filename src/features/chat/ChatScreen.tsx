import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type FlatList,
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

import { FlashList } from "../../ui/FlashList";
import {
  CHAT_BACKEND_HINT,
  deleteListingChatMessage,
  fetchListingChatMessages,
  isChatBackendMissingError,
  markListingChatMessagesRead,
  sendListingChatMessage,
  subscribeToListingChatMessages,
  type ChatMessage,
} from "../../lib/chat_api";
import {
  buildAssistantRoute,
  buildMarketProductRoute,
  buildSupplierMapRoute,
  buildSupplierShowcaseRoute,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
} from "../../lib/navigation/coreRoutes";
import { safeBack } from "../../lib/navigation/safeBack";
import { MARKET_HOME_COLORS } from "../market/marketHome.config";
import { buildMarketMapParams, loadMarketListingById } from "../market/marketHome.data";
import type { MarketHomeListingCard } from "../market/marketHome.types";
import { loadCurrentProfileIdentity } from "../profile/currentProfileIdentity";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

const CHAT_THREAD_LIST_TUNING = {
  initialNumToRender: 16,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: Platform.OS !== "web",
} as const;

const chatMessageKeyExtractor = (item: ChatMessage) => item.id;

type ChatMessageRowProps = {
  currentUserId: string | null;
  currentUserName: string | null;
  item: ChatMessage;
  onDeleteMessage: (messageId: string) => void | Promise<void>;
};

const ChatMessageRow = React.memo(function ChatMessageRow({
  currentUserId,
  currentUserName,
  item,
  onDeleteMessage,
}: ChatMessageRowProps) {
  const isOwn = currentUserId != null && item.user_id === currentUserId;
  const authorName = isOwn
    ? currentUserName || item.user?.name || "Р’С‹"
    : item.user?.name || "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ";
  const messageRowStyle = useMemo(
    () => [styles.messageRow, isOwn ? styles.messageRowOwn : null],
    [isOwn],
  );
  const messageBubbleStyle = useMemo(
    () => [styles.messageBubble, isOwn ? styles.messageBubbleOwn : null],
    [isOwn],
  );
  const timeLabel = useMemo(
    () =>
      new Date(item.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [item.created_at],
  );
  const handleLongPress = useCallback(() => {
    void onDeleteMessage(item.id);
  }, [item.id, onDeleteMessage]);

  return (
    <Pressable
      style={messageRowStyle}
      onLongPress={isOwn ? handleLongPress : undefined}
    >
      <View style={messageBubbleStyle}>
        <Text style={styles.authorText}>{authorName}</Text>
        {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}
        <Text style={styles.timeText}>{timeLabel}</Text>
      </View>
    </Pressable>
  );
});

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    listingId?: string | string[];
    supplierId?: string | string[];
    title?: string | string[];
  }>();
  const listingId = useMemo(
    () => getParam(params.listingId || params.supplierId).trim(),
    [params.listingId, params.supplierId],
  );
  const titleParam = getParam(params.title).trim();

  const [listing, setListing] = useState<MarketHomeListingCard | null>(null);
  const [title, setTitle] = useState(titleParam || "Чат по объявлению");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [backendMissing, setBackendMissing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let active = true;
    const loadCurrentUser = async () => {
      const identity = await loadCurrentProfileIdentity();
      if (active) {
        setCurrentUserId(identity.userId);
        setCurrentUserName(identity.fullName);
      }
    };
    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    try {
      const nextMessages = await fetchListingChatMessages(listingId);
      setMessages(nextMessages);
      setErrorText(null);
      setBackendMissing(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить чат.";
      setErrorText(message);
      setBackendMissing(isChatBackendMissingError(error) || message.includes(CHAT_BACKEND_HINT));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    let active = true;

    const loadListingMeta = async () => {
      if (!listingId) return;
      try {
        const row = await loadMarketListingById(listingId);
        if (!active) return;
        setListing(row);
        if (row?.title) setTitle(row.title);
      } catch {
        // Keep title fallback.
      }
    };

    void loadListingMeta();
    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!listingId || backendMissing) return;
    const unsubscribe = subscribeToListingChatMessages(listingId, () => {
      void loadMessages();
    });
    return unsubscribe;
  }, [backendMissing, listingId, loadMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    void markListingChatMessagesRead(messages);
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const nextText = input.trim();
    if (!listingId || !nextText || sending) return;

    setSending(true);
    try {
      const created = await sendListingChatMessage(listingId, nextText);
      setMessages((prev) => [...prev, created]);
      setInput("");
      setErrorText(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение.";
      Alert.alert("Чат", message);
      setErrorText(message);
    } finally {
      setSending(false);
    }
  }, [input, listingId, sending]);

  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await deleteListingChatMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось удалить сообщение.";
      Alert.alert("Чат", message);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatMessageRow
        item={item}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onDeleteMessage={handleDelete}
      />
    ),
    [currentUserId, currentUserName, handleDelete],
  );

  const chatEmptyComponent = useMemo(
    () => (
      <View style={styles.centerState}>
        <Text style={styles.stateTitle}>Пока пусто</Text>
        <Text style={styles.stateText}>
          Начните переписку по этому объявлению.
        </Text>
      </View>
    ),
    [],
  );

  if (!listingId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Чат не выбран</Text>
          <Text style={styles.stateText}>
            Откройте чат из карточки объявления или со страницы товара.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace(MARKET_TAB_ROUTE)}
            accessibilityRole="button"
            accessibilityHint="Открывает главную страницу маркета"
          >
            <Text style={styles.primaryButtonText}>Перейти в маркет</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => safeBack(router, MARKET_TAB_ROUTE)}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            accessibilityHint="Возвращает к предыдущему экрану или в маркет"
          >
            <Ionicons name="arrow-back" size={20} color={MARKET_HOME_COLORS.text} />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSubtitle}>Чат по объявлению</Text>
          </View>

          <Pressable
            style={styles.headerButton}
            onPress={() =>
              router.push(
                buildAssistantRoute({
                  context: "market",
                  prompt: `Помоги мне вести переговоры по объявлению "${title}".`,
                }),
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Открыть помощника"
            accessibilityHint="Открывает AI-помощника по этому объявлению"
          >
            <Ionicons name="sparkles" size={18} color={MARKET_HOME_COLORS.accentStrong} />
          </Pressable>
        </View>

        {listing ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeRow}
          >
            <Pressable
              style={styles.routeChip}
              onPress={() => router.push(buildMarketProductRoute(listing.id))}
              accessibilityRole="button"
            >
              <Text style={styles.routeChipText}>Товар</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() =>
                router.push(
                  buildSupplierShowcaseRoute({
                    userId: listing.sellerUserId,
                    companyId: listing.sellerCompanyId,
                  }),
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.routeChipText}>Витрина</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() =>
                router.push(
                  buildSupplierMapRoute(
                    buildMarketMapParams({ side: "all", kind: "all" }, { row: listing }),
                  ),
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.routeChipText}>Карта</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() => router.push(MARKET_TAB_ROUTE)}
              accessibilityRole="button"
            >
              <Text style={styles.routeChipText}>Маркет</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() => router.push(MARKET_AUCTIONS_ROUTE)}
              accessibilityRole="button"
            >
              <Text style={styles.routeChipText}>Торги</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {backendMissing ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Backend chat еще не поднят</Text>
            <Text style={styles.noticeText}>{CHAT_BACKEND_HINT}</Text>
          </View>
        ) : null}

        {errorText && !backendMissing ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Ошибка чата</Text>
            <Text style={styles.noticeText}>{errorText}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} />
            <Text style={styles.stateText}>Загружаем сообщения...</Text>
          </View>
        ) : (
          <FlashList
            testID="chat-thread-list"
            accessibilityLabel="chat-thread-list"
            ref={listRef}
            data={messages}
            estimatedItemSize={88}
            {...CHAT_THREAD_LIST_TUNING}
            keyExtractor={chatMessageKeyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={chatEmptyComponent}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            testID="chat-composer-input"
            accessibilityLabel="chat-composer-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Напишите сообщение..."
            placeholderTextColor="#94A3B8"
            multiline
            editable={!backendMissing && !sending}
          />
          <Pressable
            testID="chat-send-button"
            accessibilityLabel="chat-send-button"
            accessibilityRole="button"
            accessibilityHint="Отправляет сообщение в текущий чат"
            accessibilityState={{ disabled: !input.trim() || sending || backendMissing, busy: sending }}
            accessible
            style={[
              styles.sendButton,
              (!input.trim() || sending || backendMissing) && styles.sendButtonDisabled,
            ]}
            onPress={() => void handleSend()}
            disabled={!input.trim() || sending || backendMissing}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" accessible={false} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color="#FFFFFF"
                accessible={false}
                importantForAccessibility="no"
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
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
  noticeCard: {
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    gap: 6,
  },
  noticeTitle: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "900",
  },
  noticeText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  messageRow: {
    alignItems: "flex-start",
  },
  messageRowOwn: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  messageBubbleOwn: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  authorText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },
  messageText: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  timeText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    alignSelf: "flex-end",
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
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
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

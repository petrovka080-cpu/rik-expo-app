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
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlashList } from "../../ui/FlashList";
import {
  CHAT_BACKEND_HINT,
  CHAT_MESSAGE_PAGE_SIZE,
  createChatSendIntentId,
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
import { buildMarketMapParams } from "../market/marketHome.data";
import { loadMarketListingById } from "../market/market.repository";
import type { MarketHomeListingCard } from "../market/marketHome.types";
import { loadCurrentProfileIdentity } from "../profile/currentProfileIdentity";
import { styles } from "./ChatScreen.styles";
import { hasChatContentChanged, mergeChatMessages, reconcileLatestChatMessages } from "./chatThreadState";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

const CHAT_THREAD_LIST_TUNING = {
  initialNumToRender: 16,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  onEndReachedThreshold: 0.4,
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
    ? currentUserName || item.user?.name || "Вы"
    : item.user?.name || "Пользователь";
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
  const [messageScopeId, setMessageScopeId] = useState(listingId);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const versionRef = useRef(0);
  const latestRequestRef = useRef(0);
  const contentVersionRef = useRef(0);
  const olderInFlightRef = useRef(false);
  const nearBottomRef = useRef(true);
  const scrollToEndRef = useRef(true);
  const readInFlightRef = useRef(new Set<string>());
  const pendingSendRef = useRef<{ text: string; id: string } | null>(null);
  const commitMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

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

    const version = versionRef.current;
    const contentVersion = contentVersionRef.current;
    const request = ++latestRequestRef.current;
    try {
      const nextMessages = await fetchListingChatMessages(listingId);
      if (version !== versionRef.current || request !== latestRequestRef.current
        || contentVersion !== contentVersionRef.current) return;
      const reconciled = reconcileLatestChatMessages(messagesRef.current, nextMessages, CHAT_MESSAGE_PAGE_SIZE);
      scrollToEndRef.current = nearBottomRef.current;
      commitMessages(reconciled.messages);
      if (reconciled.complete) setHasOlder(false);
      else if (reconciled.resetHistory) setHasOlder(true);
      setErrorText(null);
      setBackendMissing(false);
    } catch (error: unknown) {
      if (version !== versionRef.current || request !== latestRequestRef.current) return;
      const message = error instanceof Error ? error.message : "Не удалось загрузить чат.";
      setErrorText(message);
      setBackendMissing(isChatBackendMissingError(error) || message.includes(CHAT_BACKEND_HINT));
    } finally {
      if (version === versionRef.current && request === latestRequestRef.current
        && (contentVersion === contentVersionRef.current || messagesRef.current.length > 0)) setLoading(false);
    }
  }, [commitMessages, listingId]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest || !hasOlder || olderInFlightRef.current || messageScopeId !== listingId) return;
    const version = versionRef.current;
    const contentVersion = contentVersionRef.current;
    olderInFlightRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await fetchListingChatMessages(listingId, CHAT_MESSAGE_PAGE_SIZE, {
        createdAt: oldest.created_at, id: oldest.id,
      });
      if (version !== versionRef.current || contentVersion !== contentVersionRef.current
        || messagesRef.current[0]?.id !== oldest.id) return;
      scrollToEndRef.current = false;
      commitMessages(mergeChatMessages(page, messagesRef.current));
      setHasOlder(page.length === CHAT_MESSAGE_PAGE_SIZE);
    } catch (error: unknown) {
      if (version === versionRef.current) setErrorText(error instanceof Error ? error.message : "Не удалось загрузить ранние сообщения.");
    } finally {
      if (version === versionRef.current) {
        olderInFlightRef.current = false;
        setLoadingOlder(false);
      }
    }
  }, [commitMessages, hasOlder, listingId, messageScopeId]);

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
    versionRef.current += 1;
    latestRequestRef.current += 1;
    contentVersionRef.current = 0;
    olderInFlightRef.current = false;
    readInFlightRef.current = new Set();
    pendingSendRef.current = null;
    nearBottomRef.current = true;
    scrollToEndRef.current = true;
    commitMessages([]);
    setMessageScopeId(listingId);
    setInput("");
    setHasOlder(false);
    setLoadingOlder(false);
    setSending(false);
    setLoading(true);
    setBackendMissing(false);
    setErrorText(null);
    void loadMessages();
    return () => { versionRef.current += 1; };
  }, [commitMessages, listingId, loadMessages]);

  useEffect(() => {
    if (!listingId || backendMissing) return;
    const version = versionRef.current;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refresh === undefined) refresh = setTimeout(() => {
        refresh = undefined;
        void loadMessages();
      }, 250);
    };
    const unsubscribe = subscribeToListingChatMessages(listingId, (change) => {
      if (version !== versionRef.current) return;
      const existing = messagesRef.current.find((row) => row.id === change.id);
      if (change.eventType === "DELETE" || change.message?.is_deleted) {
        contentVersionRef.current += 1;
        if (change.id) commitMessages(messagesRef.current.filter((row) => row.id !== change.id));
        scheduleRefresh();
        return;
      }
      if (change.eventType === "UPDATE" && change.message && existing) {
        if (hasChatContentChanged(existing, change.message)) {
          contentVersionRef.current += 1;
          scheduleRefresh();
        }
        commitMessages(mergeChatMessages(messagesRef.current, [{ ...change.message, user: existing.user }]));
        return;
      }
      if (change.eventType === "UPDATE") contentVersionRef.current += 1;
      scheduleRefresh();
    });
    return () => { if (refresh !== undefined) clearTimeout(refresh); unsubscribe(); };
  }, [backendMissing, commitMessages, listingId, loadMessages]);

  useEffect(() => {
    if (!currentUserId) return;
    const tracking = readInFlightRef.current;
    const unread = messages.filter((row) => row.user_id !== currentUserId
      && !row.read_by?.includes(currentUserId) && !tracking.has(row.id));
    if (!unread.length) return;
    unread.forEach((row) => tracking.add(row.id));
    void markListingChatMessagesRead(unread).catch(() => {}).finally(() => {
      unread.forEach((row) => tracking.delete(row.id));
    });
  }, [currentUserId, messages]);

  const handleSend = useCallback(async () => {
    const nextText = input.trim();
    if (!listingId || !nextText || sending || messageScopeId !== listingId) return;

    const version = versionRef.current;
    setSending(true);
    try {
      if (!pendingSendRef.current || pendingSendRef.current.text !== nextText) {
        pendingSendRef.current = { text: nextText, id: createChatSendIntentId() };
      }
      const created = await sendListingChatMessage(listingId, nextText, pendingSendRef.current.id);
      if (version !== versionRef.current) return;
      latestRequestRef.current += 1;
      scrollToEndRef.current = true;
      commitMessages(mergeChatMessages(messagesRef.current, [created]));
      pendingSendRef.current = null;
      setInput("");
      setErrorText(null);
      setLoading(false);
      if (loading) void loadMessages();
    } catch (error: unknown) {
      if (version !== versionRef.current) return;
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение.";
      Alert.alert("Чат", message);
      setErrorText(message);
    } finally {
      if (version === versionRef.current) setSending(false);
    }
  }, [commitMessages, input, listingId, loading, loadMessages, messageScopeId, sending]);

  const handleDelete = useCallback(async (messageId: string) => {
    const version = versionRef.current;
    try {
      await deleteListingChatMessage(messageId);
      if (version !== versionRef.current) return;
      if (messagesRef.current.some((message) => message.id === messageId)) {
        contentVersionRef.current += 1;
        commitMessages(messagesRef.current.filter((message) => message.id !== messageId));
        void loadMessages();
      }
    } catch (error: unknown) {
      if (version !== versionRef.current) return;
      const message = error instanceof Error ? error.message : "Не удалось удалить сообщение.";
      Alert.alert("Чат", message);
    }
  }, [commitMessages, loadMessages]);

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

        {loading || messageScopeId !== listingId ? (
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
            ListHeaderComponent={hasOlder ? (
              <Pressable testID="chat-load-older-button" accessibilityRole="button"
                accessibilityLabel="Показать ранние сообщения" disabled={loadingOlder}
                style={{ alignItems: "center", paddingVertical: 12 }} onPress={() => void loadOlder()}>
                {loadingOlder ? <ActivityIndicator /> : <Text>Показать ранние сообщения</Text>}
              </Pressable>
            ) : null}
            onScroll={({ nativeEvent }) => {
              nearBottomRef.current = nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height
                >= nativeEvent.contentSize.height - 80;
              if (!nearBottomRef.current) scrollToEndRef.current = false;
            }}
            scrollEventThrottle={32}
            onContentSizeChange={() => {
              if (scrollToEndRef.current) {
                scrollToEndRef.current = false;
                listRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            testID="chat-composer-input"
            accessibilityLabel="chat-composer-input"
            style={styles.input}
            value={messageScopeId === listingId ? input : ""}
            onChangeText={(text) => {
              if (pendingSendRef.current && pendingSendRef.current.text !== text.trim()) pendingSendRef.current = null;
              setInput(text);
            }}
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

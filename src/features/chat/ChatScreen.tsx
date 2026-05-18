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
import { styles } from "./ChatScreen.styles";

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

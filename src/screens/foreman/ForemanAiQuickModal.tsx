import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DismissKeyboardView from "../../components/DismissKeyboardView";
import CloseIconButton from "../../ui/CloseIconButton";
import type { ClarifyQuestion, ForemanAiQuickItem } from "./foreman.ai";
import type { ForemanAiQuickReviewGroup, ForemanAiQuickMode } from "./foreman.aiQuickReview";
import { buildForemanDraftContextSummary } from "./foremanDraftVisualState";
import type { ForemanAiOutcomeType } from "./foremanUi.store";
import { styles } from "./ForemanAiQuickModal.styles";
import { useForemanVoiceInput } from "./hooks/useForemanVoiceInput";

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: ForemanAiQuickMode;
  value: string;
  onChangeText: (value: string) => void;
  onParse: () => Promise<void> | void;
  onApply: () => Promise<void> | void;
  onBackToCompose: () => void;
  onSelectCandidate: (groupId: string, rikCode: string) => void;
  parseLoading: boolean;
  applying: boolean;
  canApply: boolean;
  onlineConfigured: boolean;
  error: string;
  notice: string;
  preview: ForemanAiQuickItem[];
  outcomeType: ForemanAiOutcomeType;
  reviewGroups: ForemanAiQuickReviewGroup[];
  questions: ClarifyQuestion[];
  sessionHint: string;
  aiUnavailableReason: string;
  degradedMode: boolean;
  draftLabel: string;
  draftItemsCount: number;
  ui: { text: string; sub: string; cardBg: string; border: string; accent: string };
  styles: typeof import("./foreman.styles").s;
};

const cardStyle = styles.card;

const normalizeComparableMessage = (value: string): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const KIND_LABELS: Record<string, string> = {
  material: "Материал",
  work: "Работа",
  service: "Услуга",
};

const getKindLabel = (value: string): string => KIND_LABELS[value] || value || "Позиция";

const renderMetaLine = (params: { qty?: number; unit?: string | null; kind?: string | null; code?: string | null }) =>
  [
    params.qty != null ? `${params.qty} ${params.unit || ""}`.trim() : params.unit || null,
    params.kind ? getKindLabel(params.kind) : null,
    params.code || null,
  ]
    .filter(Boolean)
    .join(" • ");

const toSelectorToken = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const NoticeCard = ({
  backgroundColor,
  borderColor,
  titleColor,
  title,
  detail,
}: {
  backgroundColor: string;
  borderColor: string;
  titleColor: string;
  title: string;
  detail?: string | null;
}) => (
  <View
    style={[styles.noticeCard, { backgroundColor, borderColor }]}
  >
    <Text style={[styles.noticeTitle, { color: titleColor }]}>{title}</Text>
    {detail ? (
      <Text style={[styles.noticeDetail, { color: titleColor }]}>
        {detail}
      </Text>
    ) : null}
  </View>
);

export default function ForemanAiQuickModal(props: Props) {
  const insets = useSafeAreaInsets();
  const voice = useForemanVoiceInput({
    visible: props.visible && props.mode === "compose",
    value: props.value,
    onChangeText: props.onChangeText,
  });

  const isComposeMode = props.mode === "compose";
  const showUnavailable = props.outcomeType === "ai_unavailable" || !props.onlineConfigured;
  const errorKey = normalizeComparableMessage(props.error);
  const noticeKey = normalizeComparableMessage(props.notice);
  const filteredQuestions = props.questions.filter((question) => {
    const promptKey = normalizeComparableMessage(question.prompt);
    return promptKey && promptKey !== errorKey && promptKey !== noticeKey;
  });

  const micIcon =
    voice.status === "listening"
      ? "stop-circle-outline"
      : voice.status === "recognizing"
        ? "radio-outline"
        : voice.status === "unsupported"
          ? "mic-off-outline"
          : "mic-outline";
  const composerDisabled = props.parseLoading || voice.status === "unsupported";
  const voiceHelperText = voice.error
    ? voice.error
    : voice.status === "listening"
      ? "Слушаю. Нажмите ещё раз, чтобы остановить запись."
      : voice.status === "recognizing"
        ? "Распознаю речь и подставляю текст в поле."
        : voice.status === "denied" || voice.status === "failed"
          ? "Нажмите на микрофон, чтобы повторить попытку."
          : voice.status === "unsupported"
            ? "Голосовой ввод недоступен на этом устройстве."
            : "Можно напечатать заявку или надиктовать её через микрофон.";
  const voiceHelperColor =
    voice.error || voice.status === "denied" || voice.status === "failed" || voice.status === "unsupported"
      ? "#fdba74"
      : props.ui.sub;
  const canParse = !!props.value.trim() && !props.parseLoading;
  const draftContext = buildForemanDraftContextSummary(
    props.draftLabel,
    props.draftItemsCount,
    isComposeMode ? "compose" : "review",
  );

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardAvoider}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
      >
        <Pressable
          onPress={props.onClose}
          style={styles.modalBackdrop}
        />

        <DismissKeyboardView
          style={[
            props.styles.sheet,
            {
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={props.styles.sheetHandle} />

          <View style={props.styles.sheetTopBar}>
            <Text style={props.styles.sheetTitle} numberOfLines={1}>
              AI заявка
            </Text>
            <CloseIconButton
              onPress={props.onClose}
              accessibilityLabel="Закрыть AI заявку"
              size={24}
              color={props.ui.text}
            />
          </View>

          {isComposeMode ? (
            <View style={styles.contentFill}>
              <ScrollView
                style={styles.flexOne}
                contentContainerStyle={styles.composeScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              >
                <View
                  style={[
                    cardStyle,
                    styles.introCard,
                  ]}
                >
                  <Text style={[styles.introTitle, { color: props.ui.text }]}>
                    Опишите материалы, работы или услуги
                  </Text>
                  <Text style={[styles.introBody, { color: props.ui.sub }]}>
                    Например: 100 кирпичей и 5 т цемента
                  </Text>
                </View>

                {props.sessionHint ? (
                  <View style={styles.infoCard}>
                    <Text style={[styles.sessionHintText, { color: props.ui.sub }]}>{props.sessionHint}</Text>
                  </View>
                ) : null}

                <View style={[styles.infoCard, styles.reviewCardGap]}>
                  <Text style={[styles.contextLabel, { color: props.ui.sub }]}>
                    {draftContext.title}
                  </Text>
                  <Text style={[styles.reviewCardTitle, { color: props.ui.text }]}>
                    {draftContext.draftLabel}
                  </Text>
                  <Text style={[styles.reviewCardMeta, { color: props.ui.sub }]}>
                    {draftContext.meta}
                  </Text>
                </View>

                {showUnavailable ? (
                  <NoticeCard
                    backgroundColor="#3f1d12"
                    borderColor="rgba(251,146,60,0.45)"
                    titleColor="#fdba74"
                    title="AI временно недоступен. Используйте каталог, смету или ручное добавление."
                    detail={props.aiUnavailableReason ? `Причина: ${props.aiUnavailableReason}` : null}
                  />
                ) : null}

                {props.degradedMode ? (
                  <NoticeCard
                    backgroundColor="rgba(245,158,11,0.12)"
                    borderColor="rgba(245,158,11,0.35)"
                    titleColor="#fde68a"
                    title="Нет сети. Можно повторить только последнюю подтверждённую позицию."
                  />
                ) : null}

                {props.error ? (
                  <NoticeCard
                    backgroundColor="rgba(239,68,68,0.12)"
                    borderColor="rgba(239,68,68,0.35)"
                    titleColor="#fecaca"
                    title={props.error}
                  />
                ) : null}
              </ScrollView>

              <View style={styles.composerShell}>
                <View style={styles.composerInputRow}>
                  <TextInput
                    testID="foreman-ai-input"
                    accessibilityLabel="foreman-ai-input"
                    value={props.value}
                    onChangeText={props.onChangeText}
                    multiline
                    textAlignVertical="top"
                    placeholder="Что нужно добавить в заявку?"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={[
                      props.styles.input,
                      styles.composerInput,
                    ]}
                  />

                  <Pressable
                    testID="foreman-ai-mic"
                    onPress={voice.isActive ? voice.stop : voice.start}
                    disabled={composerDisabled}
                    style={[
                      styles.micButton,
                      {
                        borderColor: voice.isActive ? props.ui.accent : "rgba(255,255,255,0.12)",
                        backgroundColor: voice.isActive ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.05)",
                        opacity: composerDisabled ? 0.55 : 1,
                      },
                    ]}
                    accessibilityLabel={voice.isActive ? "Остановить голосовой ввод" : "Запустить голосовой ввод"}
                  >
                    <Ionicons name={micIcon} size={22} color={props.ui.text} />
                  </Pressable>
                </View>

                <View style={styles.helperRow}>
                  <Text
                    style={[styles.helperText, { color: voiceHelperColor }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {voiceHelperText}
                  </Text>
                  <Pressable
                    testID="foreman-ai-parse"
                    accessibilityLabel="foreman-ai-parse"
                    onPress={() => void props.onParse()}
                    disabled={!canParse}
                    style={[
                      props.styles.actionBtnWide,
                      styles.parseActionButton,
                      { backgroundColor: props.ui.accent, opacity: canParse ? 1 : 0.6 },
                    ]}
                  >
                    {props.parseLoading ? <ActivityIndicator size="small" color="#0B0F14" /> : null}
                    <Text style={[props.styles.actionText, { color: "#0B0F14" }]}>
                      {props.parseLoading ? "Разбираю..." : "Разобрать"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.contentFill}>
              <ScrollView
                style={styles.flexOne}
                contentContainerStyle={styles.reviewScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {props.error ? (
                  <NoticeCard
                    backgroundColor="rgba(239,68,68,0.12)"
                    borderColor="rgba(239,68,68,0.35)"
                    titleColor="#fecaca"
                    title={props.error}
                  />
                ) : null}

                {props.notice ? (
                  <NoticeCard
                    backgroundColor="rgba(255,255,255,0.05)"
                    borderColor="rgba(255,255,255,0.1)"
                    titleColor={props.ui.text}
                    title={props.notice}
                  />
                ) : null}

                <View style={[styles.infoCard, styles.reviewCardGap]}>
                  <Text style={[styles.contextLabel, { color: props.ui.sub }]}>
                    {draftContext.title}
                  </Text>
                  <Text style={[styles.reviewCardTitle, { color: props.ui.text }]}>
                    {draftContext.draftLabel}
                  </Text>
                  <Text style={[styles.reviewCardMeta, { color: props.ui.sub }]}>
                    {draftContext.meta}
                  </Text>
                </View>

                {props.preview.length > 0 ? (
                  <View style={cardStyle}>
                    <Text style={[styles.reviewSectionTitle, { color: props.ui.text }]}>
                      Готово к добавлению
                    </Text>
                    <View style={styles.reviewSectionBody}>
                      {props.preview.map((item) => (
                        <View
                          key={`${item.rik_code}:${item.name}`}
                          style={[styles.reviewItemCard, styles.reviewCardGap, { backgroundColor: props.ui.cardBg }]}
                        >
                          <Text style={[styles.reviewCardTitle, { color: props.ui.text }]}>
                            {item.name}
                          </Text>
                          <Text style={[styles.reviewCardMeta, { color: props.ui.sub }]}>
                            {renderMetaLine({
                              qty: item.qty,
                              unit: item.unit,
                              kind: item.kind,
                              code: item.rik_code,
                            })}
                          </Text>
                          {item.specs ? (
                            <Text style={[styles.sessionHintText, { color: props.ui.text }]}>{item.specs}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {props.reviewGroups.length > 0 ? (
                  <View style={cardStyle}>
                    <Text style={[styles.reviewSectionTitle, { color: props.ui.text }]}>
                      Нужно выбрать из каталога
                    </Text>
                    <View style={styles.reviewSectionBodyLarge}>
                      {props.reviewGroups.map((group) => (
                        <View
                          key={group.groupId}
                          style={[styles.reviewItemCard, styles.reviewSectionBody, { backgroundColor: props.ui.cardBg }]}
                        >
                          <View style={styles.reviewCardGap}>
                            <Text style={[styles.reviewCardTitle, { color: props.ui.text }]}>
                              {group.sourceName}
                            </Text>
                            <Text style={[styles.reviewCardMeta, { color: props.ui.sub }]}>
                              {renderMetaLine({
                                qty: group.requestedQty,
                                unit: group.requestedUnit,
                                kind: group.kind,
                              })}
                            </Text>
                            {group.specs ? (
                              <Text style={[styles.sessionHintText, { color: props.ui.text }]}>{group.specs}</Text>
                            ) : null}
                          </View>

                          <View style={styles.optionList}>
                            {group.options.map((option) => {
                              const selected = group.selectedOption?.rik_code === option.rik_code;
                              return (
                                <Pressable
                                  testID={`foreman-ai-option-${toSelectorToken(group.groupId)}-${toSelectorToken(option.rik_code) || "empty"}`}
                                  accessibilityLabel={`foreman-ai-option-${toSelectorToken(group.groupId)}-${toSelectorToken(option.rik_code) || "empty"}`}
                                  key={`${group.groupId}:${option.rik_code}`}
                                  onPress={() => props.onSelectCandidate(group.groupId, option.rik_code)}
                                  style={[
                                    styles.reviewItemCard,
                                    styles.reviewCardGap,
                                    {
                                      borderColor: selected ? props.ui.accent : "rgba(255,255,255,0.1)",
                                      backgroundColor: selected ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                                    },
                                  ]}
                                >
                                  <Text style={[styles.optionTitle, { color: props.ui.text }]}>
                                    {option.name}
                                  </Text>
                                  <Text style={[styles.sessionHintText, { color: props.ui.sub }]}>
                                    {renderMetaLine({
                                      unit: option.unit,
                                      kind: option.kind,
                                      code: option.rik_code,
                                    })}
                                  </Text>
                                  {selected ? (
                                    <Text style={styles.selectedOptionText}>
                                      Выбрано
                                    </Text>
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {filteredQuestions.length > 0 ? (
                  <View style={cardStyle}>
                    <Text style={[styles.reviewSectionTitle, { color: props.ui.text }]}>
                      Нужно уточнение
                    </Text>
                    <View style={styles.reviewSectionBody}>
                      {filteredQuestions.map((question) => (
                        <View
                          key={question.id}
                          style={[styles.reviewItemCard, { backgroundColor: props.ui.cardBg }]}
                        >
                          <Text style={[styles.optionTitle, { color: props.ui.text, fontWeight: "400" }]}>
                            {question.prompt}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.footerDivider}>
                <View style={props.styles.reqActionsBottom}>
                  <Pressable
                    testID="foreman-ai-back"
                    accessibilityLabel="foreman-ai-back"
                    onPress={props.onBackToCompose}
                    disabled={props.parseLoading || props.applying}
                    style={[
                      props.styles.actionBtnWide,
                      {
                        backgroundColor: "rgba(255,255,255,0.08)",
                        opacity: props.parseLoading || props.applying ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={props.styles.actionText}>Назад к тексту</Text>
                  </Pressable>

                  <View style={props.styles.sp8} />

                  <Pressable
                    testID="foreman-ai-apply"
                    accessibilityLabel="foreman-ai-apply"
                    onPress={() => void props.onApply()}
                    disabled={props.parseLoading || props.applying || !props.canApply}
                    style={[
                      props.styles.actionBtnWide,
                      {
                        backgroundColor: props.ui.accent,
                        opacity: props.parseLoading || props.applying || !props.canApply ? 0.6 : 1,
                        flexDirection: "row",
                        gap: 8,
                      },
                    ]}
                  >
                    {props.applying ? <ActivityIndicator size="small" color="#0B0F14" /> : null}
                    <Text style={[props.styles.actionText, { color: "#0B0F14" }]}>
                      {props.applying ? "Добавляю..." : "Добавить в черновик"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

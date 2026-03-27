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
import type { ForemanAiOutcomeType } from "./foremanUi.store";
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
  ui: { text: string; sub: string; cardBg: string; border: string; accent: string };
  styles: typeof import("./foreman.styles").s;
};

const cardStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: 14,
};

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
    style={{
      borderRadius: 14,
      padding: 12,
      backgroundColor,
      borderWidth: 1,
      borderColor,
    }}
  >
    <Text style={{ color: titleColor, fontWeight: "800", fontSize: 13 }}>{title}</Text>
    {detail ? (
      <Text style={{ color: titleColor, fontSize: 12, marginTop: 6, opacity: 0.9 }}>
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
  const micLabel =
    voice.status === "listening"
      ? "Стоп"
      : voice.status === "recognizing"
        ? "Слушаю"
        : voice.status === "denied" || voice.status === "failed"
          ? "Повторить"
          : voice.status === "unsupported"
            ? "Недоступно"
            : "Микрофон";
  const composerDisabled = props.parseLoading || voice.status === "unsupported";

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
      >
        <Pressable
          onPress={props.onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
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
            <View style={{ flex: 1, minHeight: 0 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              >
                <View
                  style={[
                    cardStyle,
                    {
                      paddingVertical: 12,
                      backgroundColor: "rgba(255,255,255,0.02)",
                    },
                  ]}
                >
                  <Text style={{ color: props.ui.text, fontSize: 17, fontWeight: "800" }}>
                    Опишите материалы, работы или услуги
                  </Text>
                  <Text style={{ color: props.ui.sub, fontSize: 13, marginTop: 4 }}>
                    Например: 100 кирпичей и 5 т цемента
                  </Text>
                </View>

                {props.sessionHint ? (
                  <View
                    style={{
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text style={{ color: props.ui.sub, fontSize: 12 }}>{props.sessionHint}</Text>
                  </View>
                ) : null}

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

              <View
                style={{
                  marginTop: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  padding: 12,
                  gap: 12,
                }}
              >
                <TextInput
                  value={props.value}
                  onChangeText={props.onChangeText}
                  multiline
                  textAlignVertical="top"
                  placeholder="Что нужно добавить в заявку?"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    props.styles.input,
                    {
                      minHeight: 128,
                      maxHeight: 200,
                      marginBottom: 0,
                      paddingVertical: 0,
                      paddingHorizontal: 0,
                      borderWidth: 0,
                      backgroundColor: "transparent",
                    },
                  ]}
                />

                {voice.error ? (
                  <Text style={{ color: "#fdba74", fontSize: 12 }}>{voice.error}</Text>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable
                    onPress={voice.isActive ? voice.stop : voice.start}
                    disabled={composerDisabled}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: voice.isActive ? props.ui.accent : "rgba(255,255,255,0.12)",
                      backgroundColor: voice.isActive ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.05)",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: composerDisabled ? 0.55 : 1,
                    }}
                  >
                    <Ionicons name={micIcon} size={22} color={props.ui.text} />
                  </Pressable>

                  <Text
                    style={{ flex: 1, minWidth: 0, color: props.ui.sub, fontSize: 12, fontWeight: "600" }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {micLabel}
                  </Text>

                  <Pressable
                    onPress={() => void props.onParse()}
                    disabled={props.parseLoading || !props.value.trim()}
                    style={[
                      props.styles.actionBtnWide,
                      {
                        flex: 0,
                        minWidth: 132,
                        backgroundColor: props.ui.accent,
                        opacity: props.parseLoading || !props.value.trim() ? 0.6 : 1,
                        flexDirection: "row",
                        gap: 8,
                        paddingHorizontal: 18,
                      },
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
            <View style={{ flex: 1, minHeight: 0 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 12, gap: 12 }}
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

                {props.preview.length > 0 ? (
                  <View style={cardStyle}>
                    <Text style={{ color: props.ui.text, fontSize: 16, fontWeight: "800" }}>
                      Готово к добавлению
                    </Text>
                    <View style={{ gap: 10, marginTop: 12 }}>
                      {props.preview.map((item) => (
                        <View
                          key={`${item.rik_code}:${item.name}`}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.08)",
                            backgroundColor: props.ui.cardBg,
                            padding: 12,
                            gap: 4,
                          }}
                        >
                          <Text style={{ color: props.ui.text, fontSize: 14, fontWeight: "800" }}>
                            {item.name}
                          </Text>
                          <Text style={{ color: props.ui.sub, fontSize: 12, fontWeight: "700" }}>
                            {renderMetaLine({
                              qty: item.qty,
                              unit: item.unit,
                              kind: item.kind,
                              code: item.rik_code,
                            })}
                          </Text>
                          {item.specs ? (
                            <Text style={{ color: props.ui.text, fontSize: 12 }}>{item.specs}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {props.reviewGroups.length > 0 ? (
                  <View style={cardStyle}>
                    <Text style={{ color: props.ui.text, fontSize: 16, fontWeight: "800" }}>
                      Нужно выбрать из каталога
                    </Text>
                    <View style={{ gap: 12, marginTop: 12 }}>
                      {props.reviewGroups.map((group) => (
                        <View
                          key={group.groupId}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.08)",
                            backgroundColor: props.ui.cardBg,
                            padding: 12,
                            gap: 10,
                          }}
                        >
                          <View style={{ gap: 4 }}>
                            <Text style={{ color: props.ui.text, fontSize: 14, fontWeight: "800" }}>
                              {group.sourceName}
                            </Text>
                            <Text style={{ color: props.ui.sub, fontSize: 12, fontWeight: "700" }}>
                              {renderMetaLine({
                                qty: group.requestedQty,
                                unit: group.requestedUnit,
                                kind: group.kind,
                              })}
                            </Text>
                            {group.specs ? (
                              <Text style={{ color: props.ui.text, fontSize: 12 }}>{group.specs}</Text>
                            ) : null}
                          </View>

                          <View style={{ gap: 8 }}>
                            {group.options.map((option) => {
                              const selected = group.selectedOption?.rik_code === option.rik_code;
                              return (
                                <Pressable
                                  key={`${group.groupId}:${option.rik_code}`}
                                  onPress={() => props.onSelectCandidate(group.groupId, option.rik_code)}
                                  style={{
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: selected ? props.ui.accent : "rgba(255,255,255,0.1)",
                                    backgroundColor: selected ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                                    padding: 12,
                                    gap: 4,
                                  }}
                                >
                                  <Text style={{ color: props.ui.text, fontSize: 13, fontWeight: "800" }}>
                                    {option.name}
                                  </Text>
                                  <Text style={{ color: props.ui.sub, fontSize: 12 }}>
                                    {renderMetaLine({
                                      unit: option.unit,
                                      kind: option.kind,
                                      code: option.rik_code,
                                    })}
                                  </Text>
                                  {selected ? (
                                    <Text style={{ color: "#86efac", fontSize: 12, fontWeight: "700" }}>
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
                    <Text style={{ color: props.ui.text, fontSize: 16, fontWeight: "800" }}>
                      Нужно уточнение
                    </Text>
                    <View style={{ gap: 10, marginTop: 12 }}>
                      {filteredQuestions.map((question) => (
                        <View
                          key={question.id}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.08)",
                            backgroundColor: props.ui.cardBg,
                            padding: 12,
                          }}
                        >
                          <Text style={{ color: props.ui.text, fontSize: 13 }}>{question.prompt}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              <View
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.08)",
                }}
              >
                <View style={props.styles.reqActionsBottom}>
                  <Pressable
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

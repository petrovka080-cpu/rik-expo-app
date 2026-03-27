import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import CloseIconButton from "../../ui/CloseIconButton";
import DismissKeyboardView from "../../components/DismissKeyboardView";
import type { CandidateOptionGroup, ClarifyQuestion, ForemanAiQuickItem } from "./foreman.ai";
import type { ForemanAiOutcomeType } from "./foremanUi.store";
import { useForemanVoiceInput } from "./hooks/useForemanVoiceInput";

type Props = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => Promise<void> | void;
  loading: boolean;
  onlineConfigured: boolean;
  error: string;
  notice: string;
  preview: ForemanAiQuickItem[];
  outcomeType: ForemanAiOutcomeType;
  candidateGroups: CandidateOptionGroup[];
  questions: ClarifyQuestion[];
  sessionHint: string;
  aiUnavailableReason: string;
  degradedMode: boolean;
  ui: { text: string; sub: string; cardBg: string; border: string; accent: string };
  styles: typeof import("./foreman.styles").s;
};

const cardStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  padding: 12,
};

export default function ForemanAiQuickModal(props: Props) {
  const voice = useForemanVoiceInput({
    value: props.value,
    onChangeText: props.onChangeText,
  });
  const showPreview = props.preview.length > 0;
  const showCandidates = props.candidateGroups.length > 0;
  const showQuestions = props.questions.length > 0;
  const showUnavailable = props.outcomeType === "ai_unavailable" || !props.onlineConfigured;
  const showDegradedMode = props.degradedMode;
  const voiceLabel =
    voice.status === "listening"
      ? "Слушаю..."
      : voice.status === "recognizing"
        ? "Распознаю"
        : voice.status === "denied"
          ? "Доступ запрещён"
          : voice.status === "failed"
            ? "Повторить"
            : voice.status === "unsupported"
              ? "Микрофон недоступен"
              : "Голос";

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          onPress={props.onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.55)" }}
        />
        <View style={{ justifyContent: "flex-end" }}>
          <DismissKeyboardView style={props.styles.sheet}>
            <View style={props.styles.sheetHandle} />

            <View style={props.styles.sheetTopBar}>
              <Text style={props.styles.sheetTitle} numberOfLines={1}>
                AI заявка
              </Text>
              <CloseIconButton onPress={props.onClose} accessibilityLabel="Закрыть AI заявку" size={24} color={props.ui.text} />
            </View>

            <View style={props.styles.sheetMetaBox}>
              <Text style={props.styles.sheetMetaLine}>
                Опишите материалы, работы или услуги одним сообщением.
              </Text>
              <Text style={[props.styles.sheetMetaLine, { color: props.ui.sub, fontSize: 12 }]}>
                Пример: 30 мешков цемента М400, 2 куба песка и доставка на объект.
              </Text>
            </View>

            {showUnavailable ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "#3f1d12",
                  borderWidth: 1,
                  borderColor: "rgba(251,146,60,0.45)",
                }}
              >
                <Text style={{ color: "#fdba74", fontWeight: "800", fontSize: 13 }}>
                  AI временно недоступен. Используйте каталог, смету или ручное добавление позиций.
                </Text>
                {props.aiUnavailableReason ? (
                  <Text style={{ color: "#fed7aa", fontSize: 12, marginTop: 6 }}>
                    Причина: {props.aiUnavailableReason}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {showDegradedMode ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(245,158,11,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(245,158,11,0.35)",
                }}
              >
                <Text style={{ color: "#fde68a", fontWeight: "800", fontSize: 13 }}>
                  {"\u041d\u0435\u0442 \u0441\u0435\u0442\u0438. AI \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0432 degraded mode: \u043c\u043e\u0436\u043d\u043e \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044e\u044e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0438\u043b\u0438 \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433."}
                </Text>
              </View>
            ) : null}

            {props.sessionHint ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ color: props.ui.text, fontWeight: "700", fontSize: 13 }}>
                  {props.sessionHint}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: props.ui.text, fontWeight: "700", fontSize: 13 }}>
                  Голосовой ввод
                </Text>
                <Text style={{ color: props.ui.sub, fontSize: 12 }}>
                  Распознанный текст только подставляется в поле ниже. Отправка остаётся ручной.
                </Text>
                {voice.error ? (
                  <Text style={{ color: "#fdba74", fontSize: 12 }}>{voice.error}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={voice.isActive ? voice.stop : voice.start}
                disabled={props.loading || voice.status === "unsupported"}
                style={{
                  minWidth: 132,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: voice.isActive ? props.ui.accent : "rgba(255,255,255,0.12)",
                  backgroundColor: voice.isActive ? "rgba(245,158,11,0.16)" : "rgba(255,255,255,0.05)",
                  opacity: props.loading || voice.status === "unsupported" ? 0.6 : 1,
                }}
              >
                <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 13, textAlign: "center" }}>
                  {voice.isActive ? "Стоп" : voiceLabel}
                </Text>
              </Pressable>
            </View>

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
                  minHeight: 132,
                  maxHeight: 180,
                  marginBottom: 12,
                },
              ]}
            />

            {props.error ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(239,68,68,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.35)",
                }}
              >
                <Text style={{ color: "#fecaca", fontWeight: "700", fontSize: 13 }}>{props.error}</Text>
              </View>
            ) : null}

            {props.notice ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ color: props.ui.text, fontWeight: "700", fontSize: 13 }}>{props.notice}</Text>
              </View>
            ) : null}

            <View
              style={{
                flex: 1,
                minHeight: 0,
                marginBottom: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.03)",
                overflow: "hidden",
              }}
            >
              <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
                {showPreview ? (
                  <View style={[cardStyle, { backgroundColor: props.ui.cardBg }]}>
                    <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 13, marginBottom: 8 }}>
                      Распознано позиций: {props.preview.length}
                    </Text>
                    {props.preview.map((item) => (
                      <View key={`${item.rik_code}:${item.name}`} style={{ gap: 4, paddingVertical: 6 }}>
                        <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 14 }}>{item.name}</Text>
                        <Text style={{ color: props.ui.sub, fontSize: 12, fontWeight: "700" }}>
                          {item.qty} {item.unit} • {item.kind} • {item.rik_code}
                        </Text>
                        {item.specs ? (
                          <Text style={{ color: props.ui.text, fontSize: 12, fontWeight: "600" }}>{item.specs}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {showCandidates
                  ? props.candidateGroups.map((group) => (
                      <View key={`${group.sourceName}:${group.requestedQty}:${group.kind}`} style={[cardStyle, { backgroundColor: props.ui.cardBg }]}>
                        <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 14 }}>{group.sourceName}</Text>
                        <Text style={{ color: props.ui.sub, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                          {group.requestedQty} {group.requestedUnit} • {group.kind}
                        </Text>
                        {group.specs ? (
                          <Text style={{ color: props.ui.text, fontSize: 12, marginTop: 4 }}>{group.specs}</Text>
                        ) : null}
                        <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 12, marginTop: 10 }}>
                          Варианты из каталога
                        </Text>
                        {group.options.map((option) => (
                          <View
                            key={`${group.sourceName}:${option.rik_code}`}
                            style={{
                              marginTop: 8,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.08)",
                              backgroundColor: "rgba(255,255,255,0.04)",
                              padding: 10,
                            }}
                          >
                            <Text style={{ color: props.ui.text, fontWeight: "700", fontSize: 13 }}>{option.name}</Text>
                            <Text style={{ color: props.ui.sub, fontSize: 12, marginTop: 4 }}>
                              {option.unit} • {option.kind} • {option.rik_code}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))
                  : null}

                {showQuestions ? (
                  <View style={[cardStyle, { backgroundColor: props.ui.cardBg }]}>
                    <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 14, marginBottom: 8 }}>
                      Нужно уточнение
                    </Text>
                    {props.questions.map((question) => (
                      <View key={question.id} style={{ paddingVertical: 6 }}>
                        <Text style={{ color: props.ui.text, fontSize: 13 }}>{question.prompt}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {!showPreview && !showCandidates && !showQuestions ? <View style={{ minHeight: 24 }} /> : null}
              </ScrollView>
            </View>

            <View style={props.styles.reqActionsBottom}>
              <Pressable
                onPress={props.onClose}
                disabled={props.loading}
                style={[props.styles.actionBtnWide, { backgroundColor: "rgba(255,255,255,0.08)", opacity: props.loading ? 0.6 : 1 }]}
              >
                <Text style={props.styles.actionText}>Отмена</Text>
              </Pressable>

              <View style={props.styles.sp8} />

              <Pressable
                onPress={() => void props.onSubmit()}
                disabled={props.loading || !props.value.trim()}
                style={[
                  props.styles.actionBtnWide,
                  {
                    backgroundColor: props.ui.accent,
                    opacity: props.loading || !props.value.trim() ? 0.6 : 1,
                    flexDirection: "row",
                    gap: 8,
                  },
                ]}
              >
                {props.loading ? <ActivityIndicator size="small" color="#0B0F14" /> : null}
                <Text style={[props.styles.actionText, { color: "#0B0F14" }]}>
                  {props.loading ? "Формирую..." : "Сформировать черновик"}
                </Text>
              </Pressable>
            </View>
          </DismissKeyboardView>
        </View>
      </View>
    </Modal>
  );
}

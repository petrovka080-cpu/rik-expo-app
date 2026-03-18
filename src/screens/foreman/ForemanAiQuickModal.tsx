import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import RNModal from "react-native-modal";
import CloseIconButton from "../../ui/CloseIconButton";
import type { ForemanAiQuickItem } from "./foreman.ai";

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
  ui: { text: string; sub: string; cardBg: string; border: string; accent: string };
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanAiQuickModal(props: Props) {
  return (
    <RNModal
      isVisible={props.visible}
      onBackdropPress={props.onClose}
      onBackButtonPress={props.onClose}
      backdropOpacity={0.55}
      useNativeDriver={false}
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={props.styles.sheet}>
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

        {!props.onlineConfigured ? (
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
              Gemini key не настроен. Использую локальный разбор и соберу только черновик.
            </Text>
          </View>
        ) : null}

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

        {props.preview.length ? (
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
            <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 13 }}>
                Распознано позиций: {props.preview.length}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
              {props.preview.map((item) => (
                <View
                  key={`${item.rik_code}:${item.name}`}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: props.ui.cardBg,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: props.ui.text, fontWeight: "800", fontSize: 14 }}>{item.name}</Text>
                  <Text style={{ color: props.ui.sub, fontSize: 12, fontWeight: "700" }}>
                    {item.qty} {item.unit} • {item.kind} • {item.rik_code}
                  </Text>
                  {item.specs ? (
                    <Text style={{ color: props.ui.text, fontSize: 12, fontWeight: "600" }}>{item.specs}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

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
      </View>
    </RNModal>
  );
}

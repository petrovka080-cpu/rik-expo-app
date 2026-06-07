import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { GlobalSelectedWorkBinding, GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import { consumerRepairRequestScreenStyles as screenStyles } from "./ConsumerRepairRequestScreen.styles";

type Props = {
  photoCount: number;
  videoCount: number;
  documentCount: number;
  onAddPhoto: () => void;
  onAddVideo: () => void;
  onAddDocument: () => void;
};

type RequestFormCardProps = {
  problemText: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  selectedWork: GlobalSelectedWorkBinding | null;
  workSuggestions: GlobalWorkSmartSearchSuggestion[];
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onClearSelectedWork: () => void;
};

function MediaButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
      testID={testID}
    >
      <Ionicons name={icon} size={18} color="#0F172A" />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function ConsumerRepairMediaButtons({
  photoCount,
  videoCount,
  documentCount,
  onAddPhoto,
  onAddVideo,
  onAddDocument,
}: Props): React.ReactElement {
  return (
    <View style={styles.card} testID="consumer-repair-media">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Фото и видео</Text>
        <Text style={styles.counter}>Фото: {photoCount} / 5 · Видео: {videoCount} / 1</Text>
      </View>
      <View style={styles.actions}>
        <MediaButton icon="camera-outline" label="Фото" onPress={onAddPhoto} testID="consumer-repair-add-photo" />
        <MediaButton icon="videocam-outline" label="Видео" onPress={onAddVideo} testID="consumer-repair-add-video" />
        <MediaButton icon="document-text-outline" label="Документ" onPress={onAddDocument} testID="consumer-repair-add-document" />
      </View>
      <Text style={styles.hint}>Вложения: {photoCount + videoCount + documentCount}. PDF сохранит их как часть заявки.</Text>
    </View>
  );
}

export function ConsumerRepairRequestFormCard({
  problemText,
  city,
  addressText,
  preferredTimeText,
  contactPhone,
  selectedWork,
  workSuggestions,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
  onClearSelectedWork,
}: RequestFormCardProps): React.ReactElement {
  return (
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Что посчитать</Text>
      <TextInput
        multiline
        value={problemText}
        onChangeText={onProblemTextChange}
        placeholder="Например: смета на укладку ламината 100 кв м; смета на армирование фундамента 10*10*1,7*0,5"
        placeholderTextColor="#94A3B8"
        style={[screenStyles.input, screenStyles.textArea]}
        testID="consumer-repair-problem-input"
      />
      {selectedWork ? (
        <View style={styles.selectedWork} testID="consumer-repair-selected-work">
          <View style={styles.selectedWorkTextWrap}>
            <Text style={styles.selectedWorkEyebrow}>{"\u0412\u044b\u0431\u0440\u0430\u043d\u043e"}</Text>
            <Text style={styles.selectedWorkTitle} testID="consumer-repair-selected-work-title">
              {selectedWork.selectedTitleRu}
            </Text>
            <Text style={styles.selectedWorkCategory}>{selectedWork.selectedCategoryTitleRu}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0432\u044b\u0431\u043e\u0440 \u0440\u0430\u0431\u043e\u0442\u044b"}
            onPress={onClearSelectedWork}
            style={styles.clearWorkButton}
            testID="consumer-repair-clear-selected-work"
          >
            <Ionicons name="close" size={16} color="#0F172A" />
          </Pressable>
        </View>
      ) : workSuggestions.length > 0 ? (
        <View style={styles.workSuggestions} testID="consumer-repair-work-suggestions">
          {workSuggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.workKey}
              accessibilityRole="button"
              accessibilityLabel={suggestion.visibleText}
              onPress={() => onSelectWorkSuggestion(suggestion)}
              style={styles.workSuggestionButton}
              testID={`consumer-repair-work-suggestion-${index + 1}`}
            >
              <Text style={styles.workSuggestionTitle}>{suggestion.titleRu}</Text>
              <Text style={styles.workSuggestionCategory}>{suggestion.categoryTitleRu}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={screenStyles.label}>Город / адрес</Text>
      <TextInput value={city} onChangeText={onCityChange} placeholder="Город" placeholderTextColor="#94A3B8" style={screenStyles.input} testID="consumer-repair-city-input" />
      <TextInput value={addressText} onChangeText={onAddressTextChange} placeholder="Адрес" placeholderTextColor="#94A3B8" style={screenStyles.input} testID="consumer-repair-address-input" />

      <Text style={screenStyles.label}>Когда удобно</Text>
      <TextInput
        value={preferredTimeText}
        onChangeText={onPreferredTimeTextChange}
        placeholder="Сегодня, завтра или дата"
        placeholderTextColor="#94A3B8"
        style={screenStyles.input}
        testID="consumer-repair-time-input"
      />

      <Text style={screenStyles.label}>Контакт</Text>
      <TextInput value={contactPhone} onChangeText={onContactPhoneChange} placeholder="Телефон" placeholderTextColor="#94A3B8" style={screenStyles.input} testID="consumer-repair-phone-input" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 12,
  },
  headerRow: {
    gap: 4,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  counter: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  selectedWork: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectedWorkTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectedWorkEyebrow: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "900",
  },
  selectedWorkTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  selectedWorkCategory: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  clearWorkButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#5EEAD4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  workSuggestions: {
    gap: 8,
  },
  workSuggestionButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
    gap: 2,
  },
  workSuggestionTitle: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  workSuggestionCategory: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  hint: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
});

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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
  problemInputRef?: React.RefObject<TextInput | null>;
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
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
  problemInputRef,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
}: RequestFormCardProps): React.ReactElement {
  return (
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Что посчитать</Text>
      <TextInput
        ref={problemInputRef}
        multiline
        value={problemText}
        onChangeText={onProblemTextChange}
        placeholder="Например: смета на укладку ламината 100 кв м; смета на армирование фундамента 10*10*1,7*0,5"
        placeholderTextColor="#94A3B8"
        style={[screenStyles.input, screenStyles.textArea]}
        testID="consumer-repair-problem-input"
      />
      {!selectedWork && workSuggestions.length > 0 ? (
        <ScrollView
          style={styles.workSuggestionsScroll}
          contentContainerStyle={styles.workSuggestions}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          testID="consumer-repair-work-suggestions"
        >
          {workSuggestions.slice(0, 12).map((suggestion, index) => (
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
        </ScrollView>
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
  workSuggestionsScroll: {
    maxHeight: 328,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  workSuggestions: {
    gap: 8,
    padding: 8,
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

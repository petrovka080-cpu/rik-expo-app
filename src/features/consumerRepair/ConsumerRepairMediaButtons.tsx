import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
  repairType: string;
  city: string;
  addressText: string;
  preferredTimeText: string;
  contactPhone: string;
  onProblemTextChange: (value: string) => void;
  onRepairTypeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
};

const REPAIR_TYPES = ["Ремонт", "Сантехника", "Электрика", "Отделка", "Пол", "Двери/окна", "Другое"] as const;

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
  repairType,
  city,
  addressText,
  preferredTimeText,
  contactPhone,
  onProblemTextChange,
  onRepairTypeChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
}: RequestFormCardProps): React.ReactElement {
  return (
    <View style={screenStyles.card}>
      <Text style={screenStyles.label}>Описание проблемы</Text>
      <TextInput
        multiline
        value={problemText}
        onChangeText={onProblemTextChange}
        placeholder="Напишите, что нужно сделать..."
        placeholderTextColor="#94A3B8"
        style={[screenStyles.input, screenStyles.textArea]}
        testID="consumer-repair-problem-input"
      />

      <Text style={screenStyles.label}>Тип ремонта</Text>
      <View style={screenStyles.chips}>
        {REPAIR_TYPES.map((type) => {
          const selected = type === repairType;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={`Тип ремонта: ${type}`}
              onPress={() => onRepairTypeChange(type)}
              style={[screenStyles.chip, selected ? screenStyles.chipSelected : null]}
              testID={`consumer-repair-type-${type}`}
            >
              <Text style={[screenStyles.chipText, selected ? screenStyles.chipTextSelected : null]}>{type}</Text>
            </Pressable>
          );
        })}
      </View>

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
  hint: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
});

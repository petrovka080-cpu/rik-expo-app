import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { GlobalSelectedWorkBinding, GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import { WorkEstimatePromptField } from "../requests/components/WorkEstimatePromptField";
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
  onSelectTemplateCandidate: (candidate: InlineWorkTemplateCandidate) => void;
  onPrepareDraft?: () => void;
};

type DeliveryFieldsProps = Pick<
  RequestFormCardProps,
  | "city"
  | "addressText"
  | "preferredTimeText"
  | "contactPhone"
  | "onCityChange"
  | "onAddressTextChange"
  | "onPreferredTimeTextChange"
  | "onContactPhoneChange"
>;

type DeliveryFieldsState = {
  expanded: boolean;
};

const isDeliveryReady = (value: Pick<DeliveryFieldsProps, "addressText" | "contactPhone">) => {
  const addressReady = value.addressText.trim().length >= 3;
  const phoneReady = value.contactPhone.trim().replace(/\D/g, "").length >= 7;
  return addressReady && phoneReady;
};

const buildDeliverySummary = ({ city, addressText, contactPhone, preferredTimeText }: DeliveryFieldsProps) =>
  [
    [city, addressText].map((value) => value.trim()).filter(Boolean).join(", "),
    contactPhone.trim(),
    preferredTimeText.trim(),
  ].filter(Boolean).join(" · ");

class DeliveryFields extends React.PureComponent<DeliveryFieldsProps, DeliveryFieldsState> {
  state: DeliveryFieldsState = {
    expanded: !isDeliveryReady(this.props),
  };

  componentDidUpdate(prevProps: DeliveryFieldsProps) {
    const ready = isDeliveryReady(this.props);
    const wasReady = isDeliveryReady(prevProps);
    if (ready && !wasReady && this.state.expanded) {
      this.setState({ expanded: false });
    }
    if (!ready && !this.state.expanded) {
      this.setState({ expanded: true });
    }
  }

  private readonly collapseDelivery = () => {
    if (isDeliveryReady(this.props)) {
      this.setState({ expanded: false });
    }
  };

  private readonly editDelivery = () => {
    this.setState({ expanded: true });
  };

  render(): React.ReactNode {
    const {
      city,
      addressText,
      preferredTimeText,
      contactPhone,
      onCityChange,
      onAddressTextChange,
      onPreferredTimeTextChange,
      onContactPhoneChange,
    } = this.props;
    const deliveryReady = isDeliveryReady(this.props);
    const deliverySummary = buildDeliverySummary(this.props);

    return (
      <>
        <View style={styles.deliveryHeader}>
          <Text style={screenStyles.label}>Доставка</Text>
          {deliveryReady && this.state.expanded ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Свернуть доставку"
              onPress={this.collapseDelivery}
              style={styles.deliveryEditButton}
              testID="consumer-repair-delivery-collapse"
            >
              <Text style={styles.deliveryEditText}>Свернуть</Text>
            </Pressable>
          ) : null}
        </View>
        {!this.state.expanded && deliveryReady ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Изменить доставку"
            onPress={this.editDelivery}
            style={styles.deliverySummary}
            testID="consumer-repair-delivery-summary"
          >
            <Text style={styles.deliverySummaryText} numberOfLines={2}>{deliverySummary}</Text>
            <Text style={styles.deliveryEditText}>Изменить</Text>
          </Pressable>
        ) : (
          <>
            {!deliveryReady ? <Text style={styles.requiredHint}>Адрес и телефон обязательны.</Text> : null}
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
            <TextInput
              value={contactPhone}
              onChangeText={onContactPhoneChange}
              placeholder="Телефон"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              style={screenStyles.input}
              testID="consumer-repair-phone-input"
            />
          </>
        )}
      </>
    );
  }
}

export function ConsumerRepairDeliveryFieldsCard(
  props: DeliveryFieldsProps,
): React.ReactElement {
  return (
    <View
      pointerEvents="box-none"
      style={screenStyles.card}
      testID="consumer-repair-delivery-card"
    >
      <DeliveryFields {...props} />
    </View>
  );
}

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
  onSelectTemplateCandidate,
  onPrepareDraft,
}: RequestFormCardProps): React.ReactElement {
  return (
    <View pointerEvents="box-none" style={screenStyles.card}>
      <Text style={screenStyles.label}>Что посчитать</Text>
      <WorkEstimatePromptField
        value={problemText}
        selectedWork={selectedWork}
        legacyWorkSuggestions={workSuggestions}
        inputRef={problemInputRef}
        inputTestID="consumer-repair-problem-input"
        placeholder="Введите тип или вид работ: укладка плитки 45 м2, монтаж ламината 80 м2, штукатурка стен 120 м2, стяжка пола 60 м2, электромонтаж 35 точек; добавьте объем и параметры"
        onChangeText={onProblemTextChange}
        onBuildEstimate={onPrepareDraft}
        onSelectLegacyWorkSuggestion={onSelectWorkSuggestion}
        onSelectTemplateCandidate={onSelectTemplateCandidate}
      />
      {!problemText.trim() && !selectedWork ? (
        <Text style={styles.emptyState} testID="request-ui-empty-state">
          Найдите вид работ из каталога, затем добавьте объем и параметры.
        </Text>
      ) : null}

      <DeliveryFields
        city={city}
        addressText={addressText}
        preferredTimeText={preferredTimeText}
        contactPhone={contactPhone}
        onCityChange={onCityChange}
        onAddressTextChange={onAddressTextChange}
        onPreferredTimeTextChange={onPreferredTimeTextChange}
        onContactPhoneChange={onContactPhoneChange}
      />
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
  emptyState: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
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
  deliveryHeader: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  deliverySummary: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deliverySummaryText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  deliveryEditButton: {
    minHeight: 30,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  deliveryEditText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "900",
  },
  requiredHint: {
    color: "#B45309",
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

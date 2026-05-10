import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { FlashList } from "../../../ui/FlashList";
import { D } from "../buyerUi";
import type { StateSetter, StylesBag } from "./component.types";

type RfqPreviewItem = { id: string; title: string; qty: number; uom: string };
type DeliveryType = "delivery" | "pickup" | "on_site";
type VisibilityType = "open" | "company_only";
type PaymentTermsType = "cash" | "bank" | "after" | "deferred";

const DEADLINE_HOURS = [6, 12, 24, 48, 72] as const;
const DELIVERY_OPTIONS: readonly { key: DeliveryType; label: string }[] = [
  { key: "delivery", label: "Доставка" },
  { key: "pickup", label: "Самовывоз" },
  { key: "on_site", label: "На объект" },
];
const VISIBILITY_OPTIONS: readonly { key: VisibilityType; label: string }[] = [
  { key: "open", label: "Всем" },
  { key: "company_only", label: "Только свои" },
];
const PAYMENT_TERMS_OPTIONS: readonly { key: PaymentTermsType; label: string }[] = [
  { key: "cash", label: "Нал" },
  { key: "bank", label: "Безнал" },
  { key: "after", label: "По факту" },
  { key: "deferred", label: "Отсрочка" },
];

function BuyerRfqSheetBodyInner({
  s,
  rfqBusy,
  closeSheet,
  pickedIdsLen,
  rfqShowItems,
  setRfqShowItems,
  rfqPickedPreview,
  fmtLocal,
  rfqDeadlineIso,
  setDeadlineHours,
  isDeadlineHoursActive,
  rfqDeliveryDays,
  setRfqDeliveryDays,
  rfqDeliveryType,
  setRfqDeliveryType,
  rfqCity,
  setRfqCity,
  rfqCountryCodeTouchedRef,
  inferCountryCode,
  setRfqCountryCode,
  rfqAddressText,
  setRfqAddressText,
  rfqDeliveryWindow,
  setRfqDeliveryWindow,
  rfqCountryCode,
  setRfqCountryCodeTouched,
  rfqPhone,
  setRfqPhone,
  rfqEmail,
  setRfqEmail,
  rfqRememberContacts,
  setRfqRememberContacts,
  rfqVisibility,
  setRfqVisibility,
  rfqPaymentTerms,
  setRfqPaymentTerms,
  rfqNeedInvoice,
  setRfqNeedInvoice,
  rfqNeedWaybill,
  setRfqNeedWaybill,
  rfqNeedCert,
  setRfqNeedCert,
  rfqNote,
  setRfqNote,
  publishRfq,
}: {
  s: StylesBag;
  rfqBusy: boolean;
  closeSheet: () => void;
  pickedIdsLen: number;
  rfqShowItems: boolean;
  setRfqShowItems: StateSetter<boolean>;
  rfqPickedPreview: RfqPreviewItem[];
  fmtLocal: (iso: string) => string;
  rfqDeadlineIso: string;
  setDeadlineHours: (h: number) => void;
  isDeadlineHoursActive: (h: number) => boolean;
  rfqDeliveryDays: string;
  setRfqDeliveryDays: (v: string) => void;
  rfqDeliveryType: DeliveryType;
  setRfqDeliveryType: (v: DeliveryType) => void;
  rfqCity: string;
  setRfqCity: (v: string) => void;
  rfqCountryCodeTouchedRef: { current: boolean } | null;
  inferCountryCode: (cityRaw?: string, phoneRaw?: string) => string;
  setRfqCountryCode: StateSetter<string>;
  rfqAddressText: string;
  setRfqAddressText: (v: string) => void;
  rfqDeliveryWindow: string;
  setRfqDeliveryWindow: (v: string) => void;
  rfqCountryCode: string;
  setRfqCountryCodeTouched?: (v: boolean) => void;
  rfqPhone: string;
  setRfqPhone: (v: string) => void;
  rfqEmail: string;
  setRfqEmail: (v: string) => void;
  rfqRememberContacts: boolean;
  setRfqRememberContacts: StateSetter<boolean>;
  rfqVisibility: VisibilityType;
  setRfqVisibility: (v: VisibilityType) => void;
  rfqPaymentTerms: PaymentTermsType;
  setRfqPaymentTerms: (v: PaymentTermsType) => void;
  rfqNeedInvoice: boolean;
  setRfqNeedInvoice: StateSetter<boolean>;
  rfqNeedWaybill: boolean;
  setRfqNeedWaybill: StateSetter<boolean>;
  rfqNeedCert: boolean;
  setRfqNeedCert: StateSetter<boolean>;
  rfqNote: string;
  setRfqNote: (v: string) => void;
  publishRfq: () => Promise<void> | void;
}) {
  const handleCityChange = React.useCallback(
    (text: string) => {
      setRfqCity(text);
      if (!rfqCountryCodeTouchedRef?.current) setRfqCountryCode(inferCountryCode(text));
    },
    [inferCountryCode, rfqCountryCodeTouchedRef, setRfqCity, setRfqCountryCode],
  );

  const handleToggleCountryCode = React.useCallback(() => {
    if (rfqCountryCodeTouchedRef) rfqCountryCodeTouchedRef.current = true;
    setRfqCountryCodeTouched?.(true);
    setRfqCountryCode((prev) => (prev === "+996" ? "+7" : "+996"));
  }, [rfqCountryCodeTouchedRef, setRfqCountryCode, setRfqCountryCodeTouched]);

  const renderPickedPreviewItem = React.useCallback(
    ({ item }: { item: RfqPreviewItem }) => (
      <Text numberOfLines={1} style={styles.previewItemText}>
        • {item.title} — {item.qty} {item.uom}
      </Text>
    ),
    [],
  );

  const keyExtractor = React.useCallback(
    (item: RfqPreviewItem, index: number) => `${item.id}-${index}`,
    [],
  );

  const handlePublish = React.useCallback(async () => {
    await publishRfq();
  }, [publishRfq]);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={[s.modalTitle, styles.headerTitle]}>Торги (RFQ)</Text>

        <Pressable
          testID="buyer-rfq-close-top"
          accessibilityLabel="buyer-rfq-close-top"
          onPress={closeSheet}
          style={[s.smallBtn, styles.outlinePill]}
          disabled={rfqBusy}
        >
          <Text style={styles.outlinePillText}>Закрыть</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryTitle}>Позиции: {pickedIdsLen}</Text>

          <Pressable
            testID="buyer-rfq-show-items"
            accessibilityLabel="buyer-rfq-show-items"
            onPress={() => setRfqShowItems((v) => !v)}
            style={[s.smallBtn, styles.outlinePill]}
          >
            <Text style={styles.outlinePillText}>
              {rfqShowItems ? "Скрыть" : "Показать"}
            </Text>
          </Pressable>
        </View>

        {rfqShowItems ? (
          <View style={styles.summaryListBlock}>
            <FlashList
              data={rfqPickedPreview}
              renderItem={renderPickedPreviewItem}
              keyExtractor={keyExtractor}
              estimatedItemSize={28}
              scrollEnabled={false}
              removeClippedSubviews={false}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              ItemSeparatorComponent={() => <View style={styles.previewSeparator} />}
            />
            {pickedIdsLen > rfqPickedPreview.length ? (
              <Text style={styles.summaryMoreText}>+ ещё {pickedIdsLen - rfqPickedPreview.length}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.modalHelp, styles.sectionHelp]}>Сроки</Text>
        <Text style={styles.sectionTitle}>{fmtLocal(rfqDeadlineIso)}</Text>

        <View style={styles.optionWrapRow}>
          {DEADLINE_HOURS.map((hours) => (
            <Pressable
              key={hours}
              onPress={() => setDeadlineHours(hours)}
              style={[
                s.smallBtn,
                styles.outlinePill,
                isDeadlineHoursActive(hours) ? styles.activePill : null,
              ]}
            >
              <Text style={styles.outlinePillText}>{hours} ч</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop10]}>
          Срок поставки/исполнения (дней)
        </Text>
        <TextInput
          testID="buyer-rfq-delivery-days"
          accessibilityLabel="buyer-rfq-delivery-days"
          value={rfqDeliveryDays}
          onChangeText={setRfqDeliveryDays}
          keyboardType="numeric"
          style={[s.input, styles.inputChrome]}
          placeholderTextColor={D.sub}
        />

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop14]}>Доставка</Text>
        <View style={styles.optionWrapRow}>
          {DELIVERY_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setRfqDeliveryType(option.key)}
              style={[
                s.smallBtn,
                styles.outlinePill,
                rfqDeliveryType === option.key ? styles.activePill : null,
              ]}
            >
              <Text style={styles.outlinePillText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop10]}>Город</Text>
        <TextInput
          testID="buyer-rfq-city"
          accessibilityLabel="buyer-rfq-city"
          value={rfqCity}
          onChangeText={handleCityChange}
          placeholder="Бишкек"
          placeholderTextColor={D.sub}
          style={[s.input, styles.inputChrome]}
        />

        <Text style={[s.modalHelp, styles.sectionHelp]}>Адрес поставки</Text>
        <TextInput
          testID="buyer-rfq-address"
          accessibilityLabel="buyer-rfq-address"
          value={rfqAddressText}
          onChangeText={setRfqAddressText}
          placeholder="ул..., дом..., объект..."
          placeholderTextColor={D.sub}
          style={[s.input, styles.inputChrome]}
        />

        <Text style={[s.modalHelp, styles.sectionHelp]}>
          Окно приёма (пример: 9:00–18:00)
        </Text>
        <TextInput
          testID="buyer-rfq-window"
          accessibilityLabel="buyer-rfq-window"
          value={rfqDeliveryWindow}
          onChangeText={setRfqDeliveryWindow}
          placeholderTextColor={D.sub}
          style={[s.input, styles.inputChrome]}
        />

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop14]}>Контакты</Text>

        <Text style={[s.modalHelp, styles.sectionHelp]}>Телефон</Text>
        <View style={styles.phoneRow}>
          <Pressable
            testID="buyer-rfq-country-code-toggle"
            accessibilityLabel="buyer-rfq-country-code-toggle"
            onPress={handleToggleCountryCode}
            style={[s.input, styles.countryCodeButton]}
          >
            <Text style={styles.countryCodeButtonText}>{rfqCountryCode}</Text>
          </Pressable>

          <TextInput
            testID="buyer-rfq-phone"
            accessibilityLabel="buyer-rfq-phone"
            value={rfqPhone}
            onChangeText={(text) => setRfqPhone(String(text).replace(/[^\d]/g, ""))}
            placeholder="номер"
            placeholderTextColor={D.sub}
            keyboardType="phone-pad"
            style={[s.input, styles.phoneInput]}
          />
        </View>

        <Text style={styles.phoneHint}>Пример: {rfqCountryCode}xxx xxx xxx</Text>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop10]}>Email</Text>
        <TextInput
          testID="buyer-rfq-email"
          accessibilityLabel="buyer-rfq-email"
          value={rfqEmail}
          onChangeText={setRfqEmail}
          placeholder="mail@example.com"
          placeholderTextColor={D.sub}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[s.input, styles.inputChrome]}
        />

        <Pressable
          onPress={() => setRfqRememberContacts((value) => !value)}
          style={[s.smallBtn, styles.outlinePill, styles.marginTop10]}
        >
          <Text style={styles.outlinePillText}>
            {rfqRememberContacts ? "✓ Запомнить контакты" : "Запомнить контакты"}
          </Text>
        </Pressable>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop14]}>Параметры</Text>

        <Text style={[s.modalHelp, styles.sectionHelp]}>Видимость</Text>
        <View style={styles.optionWrapRow}>
          {VISIBILITY_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setRfqVisibility(option.key)}
              style={[
                s.smallBtn,
                styles.outlinePill,
                rfqVisibility === option.key ? styles.activePill : null,
              ]}
            >
              <Text style={styles.outlinePillText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop10]}>Условия оплаты</Text>
        <View style={styles.optionWrapRow}>
          {PAYMENT_TERMS_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setRfqPaymentTerms(option.key)}
              style={[
                s.smallBtn,
                styles.outlinePill,
                rfqPaymentTerms === option.key ? styles.activePill : null,
              ]}
            >
              <Text style={styles.outlinePillText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop10]}>Документы</Text>
        <View style={styles.optionWrapRow}>
          <Pressable
            onPress={() => setRfqNeedInvoice((value) => !value)}
            style={[
              s.smallBtn,
              styles.outlinePill,
              rfqNeedInvoice ? styles.activePill : null,
            ]}
          >
            <Text style={styles.outlinePillText}>{rfqNeedInvoice ? "✓ Счёт" : "Счёт"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedWaybill((value) => !value)}
            style={[
              s.smallBtn,
              styles.outlinePill,
              rfqNeedWaybill ? styles.activePill : null,
            ]}
          >
            <Text style={styles.outlinePillText}>
              {rfqNeedWaybill ? "✓ Накладная" : "Накладная"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedCert((value) => !value)}
            style={[
              s.smallBtn,
              styles.outlinePill,
              rfqNeedCert ? styles.activePill : null,
            ]}
          >
            <Text style={styles.outlinePillText}>
              {rfqNeedCert ? "✓ Сертификат" : "Сертификат"}
            </Text>
          </Pressable>
        </View>

        <Text style={[s.modalHelp, styles.sectionHelp, styles.marginTop10]}>Комментарий</Text>
        <TextInput
          testID="buyer-rfq-note"
          accessibilityLabel="buyer-rfq-note"
          value={rfqNote}
          onChangeText={setRfqNote}
          multiline
          placeholderTextColor={D.sub}
          style={[s.input, styles.noteInput]}
        />
      </ScrollView>

      <View style={styles.footerRow}>
        <Pressable
          testID="buyer-rfq-cancel"
          accessibilityLabel="buyer-rfq-cancel"
          onPress={closeSheet}
          style={[s.smallBtn, styles.footerButton]}
          disabled={rfqBusy}
        >
          <Text style={styles.outlinePillText}>Отмена</Text>
        </Pressable>

        <Pressable
          testID="buyer-rfq-publish"
          accessibilityLabel="buyer-rfq-publish"
          disabled={rfqBusy}
          onPress={() => {
            void handlePublish();
          }}
          style={[
            s.smallBtn,
            styles.publishButton,
            rfqBusy ? styles.publishButtonBusy : null,
          ]}
        >
          <Text style={styles.publishButtonText}>
            {rfqBusy ? "Публикуем…" : "Опубликовать"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const BuyerRfqSheetBody = React.memo(BuyerRfqSheetBodyInner);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    color: D.text,
  },
  outlinePill: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  outlinePillText: {
    fontWeight: "900",
    color: D.text,
  },
  summaryCard: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryTitle: {
    fontWeight: "900",
    color: D.text,
    flex: 1,
  },
  summaryListBlock: {
    marginTop: 8,
  },
  previewItemText: {
    color: D.text,
    fontWeight: "700",
  },
  previewSeparator: {
    height: 6,
  },
  summaryMoreText: {
    color: D.sub,
    marginTop: 4,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionHelp: {
    color: D.sub,
    fontWeight: "800",
  },
  sectionTitle: {
    fontWeight: "900",
    marginBottom: 6,
    color: D.text,
  },
  marginTop10: {
    marginTop: 10,
  },
  marginTop14: {
    marginTop: 14,
  },
  optionWrapRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  activePill: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "rgba(34,197,94,0.55)",
  },
  inputChrome: {
    backgroundColor: "rgba(255,255,255,0.06)",
    color: D.text,
    borderColor: "rgba(255,255,255,0.12)",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCodeButton: {
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  countryCodeButtonText: {
    fontWeight: "900",
    color: D.text,
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: D.text,
    borderColor: "rgba(255,255,255,0.12)",
  },
  phoneHint: {
    fontSize: 11,
    color: D.sub,
    fontWeight: "800",
    marginTop: 6,
  },
  noteInput: {
    minHeight: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: D.text,
    borderColor: "rgba(255,255,255,0.12)",
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  footerButton: {
    flex: 1,
    alignItems: "center",
  },
  publishButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  publishButtonBusy: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: "#0B0F14",
    fontWeight: "900",
  },
});

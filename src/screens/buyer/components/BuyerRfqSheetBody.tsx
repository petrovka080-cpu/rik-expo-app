import React from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";

import { D } from "../buyerUi";
import { FlashList } from "../../../ui/FlashList";
import type { StateSetter, StylesBag } from "./component.types";

type RfqPreviewItem = { id: string; title: string; qty: number; uom: string };
type DeliveryType = "delivery" | "pickup" | "on_site";
type VisibilityType = "open" | "company_only";
type PaymentTermsType = "cash" | "bank" | "after" | "deferred";

const DEADLINE_HOURS = [6, 12, 24, 48, 72] as const;
const DELIVERY_OPTIONS: ReadonlyArray<{ key: DeliveryType; label: string }> = [
  { key: "delivery", label: "Доставка" },
  { key: "pickup", label: "Самовывоз" },
  { key: "on_site", label: "На объект" },
];
const VISIBILITY_OPTIONS: ReadonlyArray<{ key: VisibilityType; label: string }> = [
  { key: "open", label: "Всем" },
  { key: "company_only", label: "Только свои" },
];
const PAYMENT_TERMS_OPTIONS: ReadonlyArray<{ key: PaymentTermsType; label: string }> = [
  { key: "cash", label: "Нал" },
  { key: "bank", label: "Безнал" },
  { key: "after", label: "По факту" },
  { key: "deferred", label: "Отсрочка" },
];

export function BuyerRfqSheetBody({
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
      <Text numberOfLines={1} style={{ color: D.text, fontWeight: "700" }}>
        • {item.title} — {item.qty} {item.uom}
      </Text>
    ),
    [],
  );
  const keyExtractor = React.useCallback((item: RfqPreviewItem, index: number) => `${item.id}-${index}`, []);
  const handlePublish = React.useCallback(async () => {
    await publishRfq();
  }, [publishRfq]);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={[s.modalTitle, { flex: 1, color: D.text }]}>Торги (RFQ)</Text>

        <Pressable
          onPress={closeSheet}
          style={[
            s.smallBtn,
            { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
          disabled={rfqBusy}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>Закрыть</Text>
        </Pressable>
      </View>

      <View
        style={{
          marginTop: 10,
          padding: 10,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontWeight: "900", color: D.text, flex: 1 }}>
            Позиции: {pickedIdsLen}
          </Text>

          <Pressable
            onPress={() => setRfqShowItems((v) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>
              {rfqShowItems ? "Скрыть" : "Показать"}
            </Text>
          </Pressable>
        </View>

        {rfqShowItems ? (
          <View style={{ marginTop: 8 }}>
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
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            />
            {pickedIdsLen > rfqPickedPreview.length ? (
              <Text style={{ color: D.sub, marginTop: 4, fontWeight: "800" }}>
                + ещё {pickedIdsLen - rfqPickedPreview.length}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: 10 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.modalHelp, { marginTop: 2, color: D.sub, fontWeight: "800" }]}>Сроки</Text>
        <Text style={{ fontWeight: "900", marginBottom: 6, color: D.text }}>
          {fmtLocal(rfqDeadlineIso)}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {DEADLINE_HOURS.map((hours) => (
            <Pressable
              key={hours}
              onPress={() => setDeadlineHours(hours)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                isDeadlineHoursActive(hours) && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{hours} ч</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>
          Срок поставки/исполнения (дней)
        </Text>
        <TextInput
          value={rfqDeliveryDays}
          onChangeText={setRfqDeliveryDays}
          keyboardType="numeric"
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
          placeholderTextColor={D.sub}
        />

        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Доставка</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {DELIVERY_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setRfqDeliveryType(option.key)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqDeliveryType === option.key && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Город</Text>
        <TextInput
          value={rfqCity}
          onChangeText={handleCityChange}
          placeholder="Бишкек"
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Адрес поставки</Text>
        <TextInput
          value={rfqAddressText}
          onChangeText={setRfqAddressText}
          placeholder="ул..., дом..., объект..."
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Окно приёма (пример: 9:00–18:00)</Text>
        <TextInput
          value={rfqDeliveryWindow}
          onChangeText={setRfqDeliveryWindow}
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Контакты</Text>

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Телефон</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={handleToggleCountryCode}
            style={[
              s.input,
              {
                minWidth: 92,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.12)",
              },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqCountryCode}</Text>
          </Pressable>

          <TextInput
            value={rfqPhone}
            onChangeText={(text) => setRfqPhone(String(text).replace(/[^\d]/g, ""))}
            placeholder="номер"
            placeholderTextColor={D.sub}
            keyboardType="phone-pad"
            style={[
              s.input,
              { flex: 1, minWidth: 0, backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
            ]}
          />
        </View>

        <Text style={{ fontSize: 11, color: D.sub, fontWeight: "800", marginTop: 6 }}>
          Пример: {rfqCountryCode}xxx xxx xxx
        </Text>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Email</Text>
        <TextInput
          value={rfqEmail}
          onChangeText={setRfqEmail}
          placeholder="mail@example.com"
          placeholderTextColor={D.sub}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Pressable
          onPress={() => setRfqRememberContacts((value) => !value)}
          style={[
            s.smallBtn,
            { marginTop: 10, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>
            {rfqRememberContacts ? "✓ Запомнить контакты" : "Запомнить контакты"}
          </Text>
        </Pressable>

        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Параметры</Text>

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Видимость</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {VISIBILITY_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setRfqVisibility(option.key)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqVisibility === option.key && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Условия оплаты</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {PAYMENT_TERMS_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setRfqPaymentTerms(option.key)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqPaymentTerms === option.key && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Документы</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setRfqNeedInvoice((value) => !value)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedInvoice && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedInvoice ? "✓ Счёт" : "Счёт"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedWaybill((value) => !value)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedWaybill && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedWaybill ? "✓ Накладная" : "Накладная"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedCert((value) => !value)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedCert && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedCert ? "✓ Сертификат" : "Сертификат"}</Text>
          </Pressable>
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Комментарий</Text>
        <TextInput
          value={rfqNote}
          onChangeText={setRfqNote}
          multiline
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { minHeight: 90, backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Pressable
          onPress={closeSheet}
          style={[
            s.smallBtn,
            { flex: 1, alignItems: "center", borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
          disabled={rfqBusy}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>Отмена</Text>
        </Pressable>

        <Pressable
          disabled={rfqBusy}
          onPress={() => {
            void handlePublish();
          }}
          style={[
            s.smallBtn,
            { flex: 1, alignItems: "center", backgroundColor: "#22C55E", borderColor: "#22C55E", opacity: rfqBusy ? 0.6 : 1 },
          ]}
        >
          <Text style={{ color: "#0B0F14", fontWeight: "900" }}>
            {rfqBusy ? "Публикуем…" : "Опубликовать"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

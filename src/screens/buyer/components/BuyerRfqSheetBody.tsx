import React from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";

import { D } from "../buyerUi";
import type { StateSetter, StylesBag } from "./component.types";
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
  setRfqCountryCodeTouched, // optional helper (можно не использовать)
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
  rfqPickedPreview: { id: string; title: string; qty: number; uom: string }[];

  fmtLocal: (iso: string) => string;
  rfqDeadlineIso: string;
  setDeadlineHours: (h: number) => void;
  isDeadlineHoursActive: (h: number) => boolean;

  rfqDeliveryDays: string;
  setRfqDeliveryDays: (v: string) => void;

  rfqDeliveryType: "delivery" | "pickup" | "on_site";
  setRfqDeliveryType: (v: "delivery" | "pickup" | "on_site") => void;

  rfqCity: string;
  setRfqCity: (v: string) => void;
  rfqCountryCodeTouchedRef: { current: boolean } | null; // useRef<boolean>
  inferCountryCode: (cityRaw?: string, phoneRaw?: string) => string;
  setRfqCountryCode: StateSetter<string>;

  rfqAddressText: string;
  setRfqAddressText: (v: string) => void;

  rfqDeliveryWindow: string;
  setRfqDeliveryWindow: (v: string) => void;

  rfqCountryCode: string;
  setRfqCountryCodeTouched?: (v: boolean) => void; // не обязателен
  rfqPhone: string;
  setRfqPhone: (v: string) => void;

  rfqEmail: string;
  setRfqEmail: (v: string) => void;

  rfqRememberContacts: boolean;
  setRfqRememberContacts: StateSetter<boolean>;

  rfqVisibility: "open" | "company_only";
  setRfqVisibility: (v: "open" | "company_only") => void;

  rfqPaymentTerms: "cash" | "bank" | "after" | "deferred";
  setRfqPaymentTerms: (v: "cash" | "bank" | "after" | "deferred") => void;

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
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {/* HEADER */}
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

      {/* POSITIONS */}
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
          <View style={{ marginTop: 8, gap: 6 }}>
            {rfqPickedPreview.map((x) => (
              <Text key={x.id} numberOfLines={1} style={{ color: D.text, fontWeight: "700" }}>
                • {x.title} — {x.qty} {x.uom}
              </Text>
            ))}
            {pickedIdsLen > rfqPickedPreview.length ? (
              <Text style={{ color: D.sub, marginTop: 4, fontWeight: "800" }}>
                + ещё {pickedIdsLen - rfqPickedPreview.length}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* SCROLL CONTENT */}
      <ScrollView
        style={{ flex: 1, marginTop: 10 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* SECTION: СРОКИ */}
        <Text style={[s.modalHelp, { marginTop: 2, color: D.sub, fontWeight: "800" }]}>Сроки</Text>
        <Text style={{ fontWeight: "900", marginBottom: 6, color: D.text }}>
          {fmtLocal(rfqDeadlineIso)}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[6, 12, 24, 48, 72].map((h) => (
            <Pressable
              key={h}
              onPress={() => setDeadlineHours(h)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                isDeadlineHoursActive(h) && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{h} ч</Text>
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

        {/* SECTION: ДОСТАВКА */}
        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Доставка</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[
            { k: "delivery", t: "Доставка" },
            { k: "pickup", t: "Самовывоз" },
            { k: "on_site", t: "На объект" },
          ].map((x) => (
            <Pressable
              key={x.k}
              onPress={() => setRfqDeliveryType(x.k as "delivery" | "pickup" | "on_site")}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqDeliveryType === (x.k as "delivery" | "pickup" | "on_site") && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{x.t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Город</Text>
        <TextInput
          value={rfqCity}
          onChangeText={(t) => {
            setRfqCity(t);
            if (!rfqCountryCodeTouchedRef?.current) setRfqCountryCode(inferCountryCode(t));
          }}
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

        {/* CONTACTS */}
        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Контакты</Text>

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Телефон</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => {
              if (rfqCountryCodeTouchedRef) rfqCountryCodeTouchedRef.current = true;
              setRfqCountryCode((prev) => (prev === "+996" ? "+7" : "+996"));
            }}
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
            onChangeText={(t) => setRfqPhone(String(t).replace(/[^\d]/g, ""))}
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
          onPress={() => setRfqRememberContacts((v) => !v)}
          style={[
            s.smallBtn,
            { marginTop: 10, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>
            {rfqRememberContacts ? "✓ Запомнить контакты" : "Запомнить контакты"}
          </Text>
        </Pressable>

        {/* PARAMETERS */}
        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Параметры</Text>

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Видимость</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[
            { k: "open", t: "Всем" },
            { k: "company_only", t: "Только свои" },
          ].map((x) => (
            <Pressable
              key={x.k}
              onPress={() => setRfqVisibility(x.k as "open" | "company_only")}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqVisibility === (x.k as "open" | "company_only") && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{x.t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Условия оплаты</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["cash", "bank", "after", "deferred"] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setRfqPaymentTerms(k)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqPaymentTerms === k && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>
                {k === "cash" ? "Нал" : k === "bank" ? "Безнал" : k === "after" ? "По факту" : "Отсрочка"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Документы</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setRfqNeedInvoice((v) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedInvoice && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedInvoice ? "✓ Счёт" : "Счёт"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedWaybill((v) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedWaybill && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedWaybill ? "✓ Накладная" : "Накладная"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedCert((v) => !v)}
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

      {/* FOOTER */}
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
          onPress={async () => { await publishRfq(); }}
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

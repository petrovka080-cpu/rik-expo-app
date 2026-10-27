import React from "react";
import { ScrollView, Text, TextInput, View, Pressable } from "react-native";

import type { Attachment } from "../buyer.types";
import { D } from "../buyerUi";
import { WideActionButton } from "./common/WideActionButton";
import type { StylesBag } from "./component.types";

type AccountingSupplier = {
  name: string;
  inn?: string | null;
  bank?: string | null;
  phone?: string | null;
  email?: string | null;
};

type InvoiceFile = Attachment["file"] | null;

function BuyerAccountingSheetBodyInner({
  s,
  isWeb,
  acctProposalId,
  propDocBusy,
  propDocAttached,
  acctSupp,
  invNumber,
  setInvNumber,
  invDate,
  setInvDate,
  invAmount,
  setInvAmount,
  invCurrency,
  setInvCurrency,
  invoiceUploadedName,
  openInvoicePickerWeb,
  invFile,
  pickInvoiceFile,
  setInvFile,
  acctBusy,
  sendToAccounting,
  closeSheet,
}: {
  s: StylesBag;
  isWeb: boolean;
  acctProposalId: string | number | null;
  propDocBusy: boolean;
  propDocAttached: { name: string; url?: string } | null;
  acctSupp: AccountingSupplier | null;
  invNumber: string;
  setInvNumber: (v: string) => void;
  invDate: string;
  setInvDate: (v: string) => void;
  invAmount: string;
  setInvAmount: (v: string) => void;
  invCurrency: string;
  setInvCurrency: (v: string) => void;
  invoiceUploadedName: string;
  openInvoicePickerWeb: () => void;
  invFile: InvoiceFile;
  pickInvoiceFile: () => Promise<InvoiceFile>;
  setInvFile: (v: InvoiceFile) => void;
  acctBusy: boolean;
  sendToAccounting: () => void | Promise<void>;
  closeSheet: () => void;
}) {
  const invFileName =
    invFile && typeof invFile === "object" && "name" in invFile && typeof invFile.name === "string"
      ? invFile.name
      : "";
  const invoiceLabel = isWeb
    ? invoiceUploadedName
      ? `Счёт прикреплён: ${invoiceUploadedName}`
      : "Прикрепить счёт (PDF/JPG/PNG)"
    : invFileName
      ? `Счёт прикреплён: ${invFileName}`
      : "Прикрепить счёт (PDF/JPG/PNG)";
  const handlePickInvoice = React.useCallback(async () => {
    if (isWeb) {
      openInvoicePickerWeb();
      return;
    }
    const file = await pickInvoiceFile();
    if (file) setInvFile(file);
  }, [isWeb, openInvoicePickerWeb, pickInvoiceFile, setInvFile]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>
        {acctProposalId ? `Документ: #${String(acctProposalId).slice(0, 8)}` : "Документ не выбран"}
      </Text>

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 8, fontWeight: "800" }}>
        {propDocBusy
          ? "Готовим файл предложения..."
          : propDocAttached
            ? `Файл предложения: ${propDocAttached.name}`
            : "Файл предложения будет прикреплён"}
      </Text>

      {acctSupp ? (
        <View
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 12,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>{acctSupp.name}</Text>
          <Text style={{ color: D.sub, marginTop: 6, fontWeight: "700" }}>
            {acctSupp.inn ? `ИНН: ${acctSupp.inn} · ` : ""}
            {acctSupp.bank ? `Счёт: ${acctSupp.bank} · ` : ""}
            {acctSupp.phone ? `Тел.: ${acctSupp.phone} · ` : ""}
            {acctSupp.email ? `Email: ${acctSupp.email}` : ""}
          </Text>
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 14, fontWeight: "800" }}>Номер счёта</Text>
      <TextInput
        value={invNumber}
        onChangeText={setInvNumber}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Дата (YYYY-MM-DD)</Text>
      <TextInput
        value={invDate}
        onChangeText={setInvDate}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Сумма</Text>
      <TextInput
        value={invAmount}
        onChangeText={setInvAmount}
        keyboardType="decimal-pad"
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Валюта</Text>
      <TextInput
        value={invCurrency}
        onChangeText={setInvCurrency}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Pressable
        onPress={() => {
          void handlePickInvoice();
        }}
        style={[
          s.smallBtn,
          { marginTop: 12, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
        ]}
      >
        <Text style={{ color: D.text, fontWeight: "900" }}>{invoiceLabel}</Text>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <WideActionButton
          label={acctBusy ? "Отправляем..." : "Отправить"}
          variant="green"
          disabled={acctBusy}
          loading={acctBusy}
          onPress={sendToAccounting}
        />

        <WideActionButton label="Отмена" variant="neutral" disabled={acctBusy} onPress={closeSheet} />
      </View>
    </ScrollView>
  );
}

export const BuyerAccountingSheetBody = React.memo(BuyerAccountingSheetBodyInner);

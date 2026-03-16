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

export function BuyerAccountingSheetBody({
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
      ? `РЎС‡РµС‚ РїСЂРёРєСЂРµРїР»РµРЅ: ${invoiceUploadedName}`
      : "РџСЂРёРєСЂРµРїРёС‚СЊ СЃС‡РµС‚ (PDF/JPG/PNG)"
    : invFileName
      ? `РЎС‡РµС‚ РїСЂРёРєСЂРµРїР»РµРЅ: ${invFileName}`
      : "РџСЂРёРєСЂРµРїРёС‚СЊ СЃС‡РµС‚ (PDF/JPG/PNG)";
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
        {acctProposalId ? `Р”РѕРєСѓРјРµРЅС‚: #${String(acctProposalId).slice(0, 8)}` : "Р”РѕРєСѓРјРµРЅС‚ РЅРµ РІС‹Р±СЂР°РЅ"}
      </Text>

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 8, fontWeight: "800" }}>
        {propDocBusy
          ? "Р“РѕС‚РѕРІРёРј С„Р°Р№Р» РїСЂРµРґР»РѕР¶РµРЅРёСЏ..."
          : propDocAttached
            ? `Р¤Р°Р№Р» РїСЂРµРґР»РѕР¶РµРЅРёСЏ: ${propDocAttached.name}`
            : "Р¤Р°Р№Р» РїСЂРµРґР»РѕР¶РµРЅРёСЏ Р±СѓРґРµС‚ РїСЂРёРєСЂРµРїР»РµРЅ"}
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
            {acctSupp.inn ? `РРќРќ: ${acctSupp.inn} В· ` : ""}
            {acctSupp.bank ? `РЎС‡РµС‚: ${acctSupp.bank} В· ` : ""}
            {acctSupp.phone ? `РўРµР».: ${acctSupp.phone} В· ` : ""}
            {acctSupp.email ? `Email: ${acctSupp.email}` : ""}
          </Text>
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 14, fontWeight: "800" }}>РќРѕРјРµСЂ СЃС‡РµС‚Р°</Text>
      <TextInput
        value={invNumber}
        onChangeText={setInvNumber}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Р”Р°С‚Р° (YYYY-MM-DD)</Text>
      <TextInput
        value={invDate}
        onChangeText={setInvDate}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>РЎСѓРјРјР°</Text>
      <TextInput
        value={invAmount}
        onChangeText={setInvAmount}
        keyboardType="decimal-pad"
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Р’Р°Р»СЋС‚Р°</Text>
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
          label={acctBusy ? "РћС‚РїСЂР°РІР»СЏРµРј..." : "РћС‚РїСЂР°РІРёС‚СЊ"}
          variant="green"
          disabled={acctBusy}
          loading={acctBusy}
          onPress={sendToAccounting}
        />

        <WideActionButton label="РћС‚РјРµРЅР°" variant="neutral" disabled={acctBusy} onPress={closeSheet} />
      </View>
    </ScrollView>
  );
}

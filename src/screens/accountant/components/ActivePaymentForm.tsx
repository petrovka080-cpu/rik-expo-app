import React from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import {
  fmt2,
  fmtQty,
  kindOf,
  nnum,
  round2,
  type AccountantPaymentAllocRow as AllocRow,
  type AccountantPaymentCurrentInvoice as CurrentInvoice,
} from "../accountant.paymentForm.helpers";
import { useAccountantPaymentForm } from "../useAccountantPaymentForm";
import { runNextTick } from "../helpers";
import { S, UI } from "../ui";

type Props = {
  busyKey: string | null;
  isPayActiveTab: boolean;
  payAccent: object | null;
  kbTypeNum: "default" | "numeric" | "number-pad" | "decimal-pad" | "phone-pad";
  current: CurrentInvoice | null;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  INV_PREFIX: string;
  invMM: string;
  invDD: string;
  setSupplierName: React.Dispatch<React.SetStateAction<string>>;
  setInvoiceNo: React.Dispatch<React.SetStateAction<string>>;
  setInvoiceDate: React.Dispatch<React.SetStateAction<string>>;
  setInvMM: React.Dispatch<React.SetStateAction<string>>;
  setInvDD: React.Dispatch<React.SetStateAction<string>>;
  clamp2: (value: string, max: number) => string;
  mmRef: React.RefObject<TextInput | null>;
  ddRef: React.RefObject<TextInput | null>;
  scrollInputIntoView: (event: unknown, offset?: number) => void;
  accountantFio: string;
  setAccountantFio: React.Dispatch<React.SetStateAction<string>>;
  payKind: "bank" | "cash";
  setPayKind: React.Dispatch<React.SetStateAction<"bank" | "cash">>;
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  bankName: string;
  setBankName: React.Dispatch<React.SetStateAction<string>>;
  bik: string;
  setBik: React.Dispatch<React.SetStateAction<string>>;
  rs: string;
  setRs: React.Dispatch<React.SetStateAction<string>>;
  inn: string;
  setInn: React.Dispatch<React.SetStateAction<string>>;
  kpp: string;
  setKpp: React.Dispatch<React.SetStateAction<string>>;
  allocRows: AllocRow[];
  setAllocRows: React.Dispatch<React.SetStateAction<AllocRow[]>>;
  onAllocStatus?: (ok: boolean, sum: number) => void;
};

export default function ActivePaymentForm({
  busyKey,
  isPayActiveTab,
  payAccent,
  kbTypeNum,

  current,
  supplierName,
  invoiceNo,
  invoiceDate,
  INV_PREFIX,
  invMM,
  invDD,

  setSupplierName,
  setInvoiceNo,
  setInvoiceDate,
  setInvMM,
  setInvDD,

  clamp2,
  mmRef,
  ddRef,
  scrollInputIntoView,

  accountantFio,
  setAccountantFio,

  payKind,
  setPayKind,

  amount,
  setAmount,

  note,
  setNote,

  bankName,
  setBankName,
  bik,
  setBik,
  rs,
  setRs,
  inn,
  setInn,
  kpp,
  setKpp,

  allocRows,
  setAllocRows,
  onAllocStatus,
}: Props) {
  const {
    proposalId,
    mode,
    cur,
    items,
    itemsLoading,
    paymentDataErrorMessage,
    lineInputs,
    restProposal,
    lineTotals,
    paidBeforeByLine,
    paidUnassigned,
    remainByLine,
    allocMap,
    allocSum,
    allocOk,
    selectFullMode,
    selectPartialMode,
    setLineAllocInput,
    commitLineInput,
    setLineAllocMax,
    clearAlloc,
  } = useAccountantPaymentForm({
    current,
    amount,
    setAmount,
    allocRows,
    setAllocRows,
    onAllocStatus,
  });

  const segBtn = (active: boolean) => ({
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: active ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: active ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.14)",
    opacity: busyKey ? 0.6 : 1,
  });

  const smallBtn = (kind: "green" | "neutral", disabled?: boolean) => ({
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: kind === "green" ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.14)",
    backgroundColor: kind === "green" ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.06)",
    opacity: disabled ? 0.55 : 1,
  });

  const miniBtn = (disabled?: boolean) => ({
    width: 54,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.55)",
    backgroundColor: "rgba(34,197,94,0.16)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: disabled ? 0.55 : 1,
  });

  return (
    <>
      <View style={S.section}>
        <TextInput
          value={accountantFio}
          onChangeText={setAccountantFio}
          placeholder="Р¤РРћ Р±СѓС…РіР°Р»С‚РµСЂР° *"
          placeholderTextColor={UI.sub}
          onFocus={(e) => scrollInputIntoView(e)}
          style={S.input(!!String(accountantFio || "").trim())}
        />

        <View style={{ height: 10 }} />

        {(() => {
          const invNoServer = String(current?.invoice_number ?? "").trim();
          const suppServer = String(current?.supplier ?? "").trim();

          const invNo0 = String((invoiceNo || invNoServer) ?? "").trim();
          const supp0 = String((supplierName || suppServer) ?? "").trim();

          return (
            <>
              {supp0 ? (
                <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 8 }} numberOfLines={1}>
                  РџРѕСЃС‚Р°РІС‰РёРє: <Text style={{ color: UI.text, fontWeight: "900" }}>{supp0}</Text>
                </Text>
              ) : null}

              <TextInput
                value={invNo0}
                onChangeText={(t) => setInvoiceNo(String(t || "").trimStart())}
                editable={!busyKey}
                placeholder="РќРѕРјРµСЂ СЃС‡С‘С‚Р° (РёРЅРІРѕР№СЃР°) *"
                placeholderTextColor={UI.sub}
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 10 }} />

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Pressable
                  disabled={!!busyKey}
                  onPress={() => {
                    const d = new Date();
                    const s = d.toISOString().slice(0, 10);
                    setInvoiceDate(s);
                    setInvMM(s.slice(5, 7));
                    setInvDD(s.slice(8, 10));
                  }}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.14)",
                    opacity: busyKey ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: UI.text, fontWeight: "900" }}>РЎРµРіРѕРґРЅСЏ</Text>
                </Pressable>

                <Pressable
                  disabled={!!busyKey}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const s = d.toISOString().slice(0, 10);
                    setInvoiceDate(s);
                    setInvMM(s.slice(5, 7));
                    setInvDD(s.slice(8, 10));
                  }}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.14)",
                    opacity: busyKey ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: UI.text, fontWeight: "900" }}>Р’С‡РµСЂР°</Text>
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.55)",
                  backgroundColor: "rgba(34,197,94,0.06)",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  opacity: busyKey ? 0.9 : 1,
                }}
              >
                <Text style={{ color: UI.text, fontWeight: "900" }}>{INV_PREFIX}</Text>

                <TextInput
                  ref={mmRef}
                  value={invMM}
                  editable={!busyKey}
                  placeholder="MM"
                  placeholderTextColor={UI.sub}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : kbTypeNum}
                  maxLength={2}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onFocus={(e) => scrollInputIntoView(e, 220)}
                  onChangeText={(t) => {
                    const d = String(t || "").replace(/\D+/g, "").slice(0, 2);
                    setInvMM(d);
                    if (d.length === 2) runNextTick(() => ddRef?.current?.focus?.());
                  }}
                  onBlur={() => setInvMM((x: string) => clamp2(x, 12))}
                  style={{
                    width: 42,
                    marginLeft: 10,
                    color: UI.text,
                    fontWeight: "900",
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                    textAlign: "center",
                  }}
                />

                <Text style={{ color: UI.text, fontWeight: "900", marginHorizontal: 8 }}>-</Text>

                <TextInput
                  ref={ddRef}
                  value={invDD}
                  editable={!busyKey}
                  placeholder="DD"
                  placeholderTextColor={UI.sub}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : kbTypeNum}
                  maxLength={2}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onFocus={(e) => scrollInputIntoView(e, 220)}
                  onChangeText={(t) => {
                    const d = String(t || "").replace(/\D+/g, "").slice(0, 2);
                    setInvDD(d);
                  }}
                  onBlur={() => setInvDD((x: string) => clamp2(x, 31))}
                  style={{
                    width: 42,
                    color: UI.text,
                    fontWeight: "900",
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                    textAlign: "center",
                  }}
                />
              </View>

              <View style={{ height: 12 }} />
            </>
          );
        })()}

        <View style={S.section}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable disabled={!!busyKey} onPress={() => setPayKind("bank")} style={segBtn(payKind === "bank")}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>Р‘Р°РЅРє</Text>
            </Pressable>

            <Pressable disabled={!!busyKey} onPress={() => setPayKind("cash")} style={segBtn(payKind === "cash")}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>РќР°Р»</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />

          {proposalId ? (
            <View
              style={{
                marginBottom: 10,
                padding: 12,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ color: UI.sub, fontWeight: "800" }}>РћСЃС‚Р°С‚РѕРє Рє РѕРїР»Р°С‚Рµ</Text>
              <Text
                testID="payment-form-rest"
                style={{ color: UI.text, fontWeight: "900", fontSize: 22, marginTop: 6 }}
              >
                {restProposal.toFixed(2)} {cur}
              </Text>
            </View>
          ) : null}

          {proposalId && paymentDataErrorMessage ? (
            <View
              testID="payment-form-data-error"
              style={{
                marginBottom: 10,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,99,99,0.45)",
                backgroundColor: "rgba(255,99,99,0.08)",
              }}
            >
              <Text style={{ color: UI.text, fontWeight: "900" }}>
                РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРіРѕС‚РѕРІРёС‚СЊ РґР°РЅРЅС‹Рµ РґР»СЏ РѕРїР»Р°С‚С‹
              </Text>
              <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                {paymentDataErrorMessage}
              </Text>
            </View>
          ) : null}

          {proposalId ? (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  testID="payment-form-mode-full"
                  disabled={!!busyKey}
                  onPress={selectFullMode}
                  style={segBtn(mode === "full")}
                >
                  <Text style={{ color: UI.text, fontWeight: "900" }}>РћРїР»Р°С‚РёС‚СЊ РїРѕР»РЅРѕСЃС‚СЊСЋ</Text>
                </Pressable>

                <Pressable
                  testID="payment-form-mode-partial"
                  disabled={!!busyKey}
                  onPress={selectPartialMode}
                  style={segBtn(mode === "partial")}
                >
                  <Text style={{ color: UI.text, fontWeight: "900" }}>РћРїР»Р°С‚РёС‚СЊ С‡Р°СЃС‚РёС‡РЅРѕ</Text>
                </Pressable>
              </View>

              <View style={{ height: 12 }} />
            </>
          ) : null}

          {proposalId && mode === "full" ? (
            <>
              <View style={pillBox()}>
                <Text style={pillBoxTxt()}>
                  РЎСѓРјРјР° Рє РѕРїР»Р°С‚Рµ:{" "}
                  <Text style={{ color: UI.text, fontWeight: "900" }}>
                    {restProposal.toFixed(2)} {cur}
                  </Text>
                </Text>
              </View>

              <View style={{ height: 8 }} />
              <View style={{ height: 6 }} />
            </>
          ) : null}

          {proposalId && mode === "partial" ? (
            <>
              <View
                style={{
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: allocOk ? "rgba(34,197,94,0.35)" : "rgba(255,99,99,0.45)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: UI.text }}>Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РїРѕ РїРѕР·РёС†РёСЏРј</Text>

                    <Text testID="payment-form-alloc-sum" style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                      РЎСѓРјРјР° Рє РѕРїР»Р°С‚Рµ (Р°РІС‚Рѕ):{" "}
                      <Text style={{ color: UI.text, fontWeight: "900" }}>
                        {fmt2(allocSum)} {cur}
                      </Text>
                    </Text>

                    {paidUnassigned > 0.01 ? (
                      <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                        РќРµ СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ СЂР°РЅРµРµ:{" "}
                        <Text style={{ color: UI.text, fontWeight: "900" }}>
                          {fmt2(paidUnassigned)} {cur}
                        </Text>
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      testID="payment-form-clear"
                      disabled={!!busyKey}
                      onPress={clearAlloc}
                      style={smallBtn("neutral", !!busyKey)}
                    >
                      <Text style={{ color: UI.text, fontWeight: "900" }}>РћС‡РёСЃС‚РёС‚СЊ</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ height: 10 }} />

                {itemsLoading ? (
                  <Text testID="payment-form-loading" style={{ color: UI.sub, fontWeight: "800" }}>
                    Р—Р°РіСЂСѓР¶Р°СЋ РїРѕР·РёС†РёРёвЂ¦
                  </Text>
                ) : paymentDataErrorMessage ? (
                  <Text style={{ color: UI.text, fontWeight: "800" }}>
                    Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅРѕ: {paymentDataErrorMessage}
                  </Text>
                ) : !items.length ? (
                  <Text style={{ color: UI.sub, fontWeight: "800" }}>РќРµС‚ РїРѕР·РёС†РёР№ Сѓ СЃС‡С‘С‚Р°</Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {items.map((it, idx) => {
                      const id = String(it.id);
                      const name = String(it.name_human ?? "вЂ”");
                      const uom = String(it.uom ?? "");
                      const qty = nnum(it.qty);
                      const price = nnum(it.price);
                      const total = lineTotals[idx] || 0;

                      const paidBefore = nnum(paidBeforeByLine[idx]);
                      const remain = nnum(remainByLine[idx]);

                      const committedThisPay = nnum(allocMap.get(id) ?? 0);
                      const rawThisPay = lineInputs[id] ?? (committedThisPay ? String(committedThisPay) : "");
                      const restAfter = round2(Math.max(0, total - (paidBefore + committedThisPay)));

                      return (
                        <View
                          key={id}
                          style={{
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.12)",
                            backgroundColor: "rgba(0,0,0,0.10)",
                            borderRadius: 14,
                            padding: 10,
                          }}
                        >
                          <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
                            {name}
                          </Text>

                          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={1}>
                            {kindOf(it)} вЂў {fmtQty(qty)} {uom} Г— {fmt2(price)}
                          </Text>

                          <Text
                            testID={`payment-form-line-remain-${id}`}
                            style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}
                          >
                            РћСЃС‚Р°С‚РѕРє РїРѕ РїРѕР·РёС†РёРё:{" "}
                            <Text style={{ color: UI.text, fontWeight: "900" }}>{fmt2(remain)} {cur}</Text>
                          </Text>

                          <View style={{ height: 8 }} />

                          <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                            Р­С‚РёРј РїР»Р°С‚РµР¶РѕРј РїРѕ РїРѕР·РёС†РёРё
                          </Text>

                          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <TextInput
                              testID={`payment-form-line-input-${id}`}
                              value={rawThisPay}
                              onChangeText={(text) => setLineAllocInput(id, text)}
                              onBlur={() => commitLineInput(id)}
                              editable={!busyKey}
                              placeholder="0"
                              placeholderTextColor={UI.sub}
                              keyboardType={Platform.OS === "web" ? "default" : "numeric"}
                              autoCorrect={false}
                              autoCapitalize="none"
                              onFocus={(e) => scrollInputIntoView(e, 220)}
                              style={[
                                S.input(true),
                                {
                                  flex: 1,
                                  height: 42,
                                  paddingVertical: 8,
                                  borderColor: "rgba(34,197,94,0.35)",
                                  backgroundColor: "rgba(255,255,255,0.04)",
                                  opacity: busyKey ? 0.9 : 1,
                                },
                              ]}
                            />

                            <Pressable
                              testID={`payment-form-line-max-${id}`}
                              disabled={!!busyKey || remain <= 0}
                              onPress={() => setLineAllocMax(id)}
                              style={miniBtn(!!busyKey || remain <= 0)}
                            >
                              <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>MAX</Text>
                            </Pressable>
                          </View>

                          <Text
                            testID={`payment-form-line-rest-after-${id}`}
                            style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}
                          >
                            РћРїР»Р°С‡РµРЅРѕ РґРѕ: <Text style={{ color: UI.text, fontWeight: "900" }}>{fmt2(paidBefore)} {cur}</Text>
                            {"  "}вЂў РћСЃС‚Р°С‚РѕРє РїРѕСЃР»Рµ: <Text style={{ color: UI.text, fontWeight: "900" }}>{fmt2(restAfter)} {cur}</Text>
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {!allocOk ? (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(255,99,99,0.35)",
                      backgroundColor: "rgba(255,99,99,0.07)",
                    }}
                  >
                    <Text style={{ color: UI.text, fontWeight: "900" }}>
                      вќ— Р—Р°РїРѕР»РЅРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРЅСѓ РїРѕР·РёС†РёСЋ (СЃСѓРјРјР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0).
                    </Text>
                  </View>
                ) : null}

                <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 10 }}>
                  РЎСѓРјРјР° РѕРїР»Р°С‚С‹ Р±РµСЂС‘С‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РёР· СЂР°СЃРїСЂРµРґРµР»РµРЅРёСЏ РїРѕ РїРѕР·РёС†РёСЏРј.
                </Text>
              </View>

              <View style={{ height: 12 }} />
            </>
          ) : null}

          <TextInput
            value={note}
            onChangeText={setNote}
            editable={!busyKey}
            placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№"
            placeholderTextColor={UI.sub}
            autoCorrect={false}
            autoCapitalize="none"
            multiline
            onFocus={(e) => scrollInputIntoView(e)}
            style={[
              S.input(true),
              isPayActiveTab ? { borderColor: "rgba(34,197,94,0.55)" } : null,
              { minHeight: 56, opacity: busyKey ? 0.9 : 1 },
            ]}
          />

          {payKind === "bank" ? (
            <>
              <View style={{ height: 12 }} />
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                editable={!busyKey}
                placeholder="Р‘Р°РЅРє"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as object, { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 8 }} />
              <TextInput
                value={bik}
                onChangeText={setBik}
                editable={!busyKey}
                placeholder="Р‘РРљ"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as object, { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 8 }} />
              <TextInput
                value={rs}
                onChangeText={setRs}
                editable={!busyKey}
                placeholder="Р /РЎ"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as object, { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 8 }} />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={inn}
                    onChangeText={setInn}
                    editable={!busyKey}
                    placeholder="РРќРќ"
                    placeholderTextColor={UI.sub}
                    keyboardType={kbTypeNum}
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={(e) => scrollInputIntoView(e)}
                    style={[S.input(true), payAccent as object, { opacity: busyKey ? 0.9 : 1 }]}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <TextInput
                    value={kpp}
                    onChangeText={setKpp}
                    editable={!busyKey}
                    placeholder="РљРџРџ"
                    placeholderTextColor={UI.sub}
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={(e) => scrollInputIntoView(e)}
                    style={[S.input(true), payAccent as object, { opacity: busyKey ? 0.9 : 1 }]}
                  />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </>
  );
}

function pillBox() {
  return {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  };
}

function pillBoxTxt() {
  return { color: UI.sub, fontWeight: "800" } as const;
}

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
import { ps } from "./ActivePaymentForm.styles";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invoiceDate,
  INV_PREFIX,
  invMM,
  invDD,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  return (
    <>
      <View style={S.section}>
        <TextInput
          value={accountantFio}
          onChangeText={setAccountantFio}
          placeholder="ФИО бухгалтера *"
          placeholderTextColor={UI.sub}
          onFocus={(e) => scrollInputIntoView(e)}
          style={S.input(!!String(accountantFio || "").trim())}
        />

        <View style={ps.gap10} />

        {(() => {
          const invNoServer = String(current?.invoice_number ?? "").trim();
          const suppServer = String(current?.supplier ?? "").trim();

          const invNo0 = String((invoiceNo || invNoServer) ?? "").trim();
          const supp0 = String((supplierName || suppServer) ?? "").trim();

          return (
            <>
              {supp0 ? (
                <Text style={ps.supplierLabel} numberOfLines={1}>
                  Поставщик: <Text style={ps.supplierValue}>{supp0}</Text>
                </Text>
              ) : null}

              <TextInput
                value={invNo0}
                onChangeText={(t) => setInvoiceNo(String(t || "").trimStart())}
                editable={!busyKey}
                placeholder="Номер счёта (инвойса) *"
                placeholderTextColor={UI.sub}
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), busyKey ? ps.opacity90 : null]}
              />

              <View style={ps.gap10} />

              <View style={ps.dateChipRow}>
                <Pressable
                  disabled={!!busyKey}
                  onPress={() => {
                    const d = new Date();
                    const s = d.toISOString().slice(0, 10);
                    setInvoiceDate(s);
                    setInvMM(s.slice(5, 7));
                    setInvDD(s.slice(8, 10));
                  }}
                  style={[ps.dateChip, busyKey ? ps.opacity60 : null]}
                >
                  <Text style={ps.boldText}>Сегодня</Text>
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
                  style={[ps.dateChip, busyKey ? ps.opacity60 : null]}
                >
                  <Text style={ps.boldText}>Вчера</Text>
                </Pressable>
              </View>

              <View style={[ps.dateInputRow, busyKey ? ps.opacity90 : null]}>
                <Text style={ps.boldText}>{INV_PREFIX}</Text>

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
                  style={ps.dateInputField}
                />

                <Text style={ps.dateSep}>-</Text>

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
                  style={ps.dateInputFieldNoML}
                />
              </View>

              <View style={ps.gap12} />
            </>
          );
        })()}

        <View style={S.section}>
          <View style={ps.segRow}>
            <Pressable
              disabled={!!busyKey}
              onPress={() => setPayKind("bank")}
              style={[
                ps.segBtnBase,
                payKind === "bank" ? ps.segBtnActive : ps.segBtnInactive,
                busyKey ? ps.opacity60 : null,
              ]}
            >
              <Text style={ps.boldText}>Банк</Text>
            </Pressable>

            <Pressable
              disabled={!!busyKey}
              onPress={() => setPayKind("cash")}
              style={[
                ps.segBtnBase,
                payKind === "cash" ? ps.segBtnActive : ps.segBtnInactive,
                busyKey ? ps.opacity60 : null,
              ]}
            >
              <Text style={ps.boldText}>Нал</Text>
            </Pressable>
          </View>

          <View style={ps.gap10} />

          {proposalId ? (
            <View style={ps.restBox}>
              <Text style={ps.subBold}>Остаток к оплате</Text>
              <Text
                testID="payment-form-rest"
                style={ps.restAmount}
              >
                {restProposal.toFixed(2)} {cur}
              </Text>
            </View>
          ) : null}

          {proposalId && paymentDataErrorMessage ? (
            <View
              testID="payment-form-data-error"
              style={ps.errorBox}
            >
              <Text style={ps.boldText}>
                Не удалось подготовить данные для оплаты
              </Text>
              <Text style={ps.subBoldMt6}>
                {paymentDataErrorMessage}
              </Text>
            </View>
          ) : null}

          {proposalId ? (
            <>
              <View style={ps.segRow}>
                <Pressable
                  testID="payment-form-mode-full"
                  disabled={!!busyKey}
                  onPress={selectFullMode}
                  style={[
                    ps.segBtnBase,
                    mode === "full" ? ps.segBtnActive : ps.segBtnInactive,
                    busyKey ? ps.opacity60 : null,
                  ]}
                >
                  <Text style={ps.boldText}>Оплатить полностью</Text>
                </Pressable>

                <Pressable
                  testID="payment-form-mode-partial"
                  disabled={!!busyKey}
                  onPress={selectPartialMode}
                  style={[
                    ps.segBtnBase,
                    mode === "partial" ? ps.segBtnActive : ps.segBtnInactive,
                    busyKey ? ps.opacity60 : null,
                  ]}
                >
                  <Text style={ps.boldText}>Оплатить частично</Text>
                </Pressable>
              </View>

              <View style={ps.gap12} />
            </>
          ) : null}

          {proposalId && mode === "full" ? (
            <>
              <View style={ps.pillBox}>
                <Text style={ps.pillBoxText}>
                  Сумма к оплате:{" "}
                  <Text style={ps.boldText}>
                    {restProposal.toFixed(2)} {cur}
                  </Text>
                </Text>
              </View>

              <View style={ps.gap8} />
              <View style={ps.gap6} />
            </>
          ) : null}

          {proposalId && mode === "partial" ? (
            <>
              <View
                style={[
                  ps.allocBox,
                  allocOk ? ps.allocBoxOk : ps.allocBoxWarn,
                ]}
              >
                <View style={ps.allocHeaderRow}>
                  <View style={ps.flex1}>
                    <Text style={ps.boldText}>Распределение по позициям</Text>

                    <Text testID="payment-form-alloc-sum" style={ps.subBoldMt6}>
                      Сумма к оплате (авто):{" "}
                      <Text style={ps.boldText}>
                        {fmt2(allocSum)} {cur}
                      </Text>
                    </Text>

                    {paidUnassigned > 0.01 ? (
                      <Text style={ps.subBoldMt6}>
                        Не распределено ранее:{" "}
                        <Text style={ps.boldText}>
                          {fmt2(paidUnassigned)} {cur}
                        </Text>
                      </Text>
                    ) : null}
                  </View>

                  <View style={ps.segRow}>
                    <Pressable
                      testID="payment-form-clear"
                      disabled={!!busyKey}
                      onPress={clearAlloc}
                      style={[
                        ps.smallBtnBase,
                        ps.smallBtnNeutral,
                        busyKey ? ps.opacity55 : null,
                      ]}
                    >
                      <Text style={ps.boldText}>Очистить</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={ps.gap10} />

                {itemsLoading ? (
                  <Text testID="payment-form-loading" style={ps.subBold}>
                    Загружаю позиции…
                  </Text>
                ) : paymentDataErrorMessage ? (
                  <Text style={ps.boldText}>
                    Распределение временно недоступно: {paymentDataErrorMessage}
                  </Text>
                ) : !items.length ? (
                  <Text style={ps.subBold}>Нет позиций у счёта</Text>
                ) : (
                  <View style={ps.lineItemsGap}>
                    {items.map((it, idx) => {
                      const id = String(it.id);
                      const name = String(it.name_human ?? "—");
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
                        <View key={id} style={ps.lineCard}>
                          <Text style={ps.boldText} numberOfLines={2}>
                            {name}
                          </Text>

                          <Text style={ps.lineSubMt4} numberOfLines={1}>
                            {kindOf(it)} • {fmtQty(qty)} {uom} × {fmt2(price)}
                          </Text>

                          <Text
                            testID={`payment-form-line-remain-${id}`}
                            style={ps.subBoldMt6}
                          >
                            Остаток по позиции:{" "}
                            <Text style={ps.boldText}>{fmt2(remain)} {cur}</Text>
                          </Text>

                          <View style={ps.gap8} />

                          <Text style={ps.lineSubMb6}>
                            Этим платежом по позиции
                          </Text>

                          <View style={ps.lineInputRow}>
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
                                ps.lineAllocInput,
                                busyKey ? ps.opacity90 : null,
                              ]}
                            />

                            <Pressable
                              testID={`payment-form-line-max-${id}`}
                              disabled={!!busyKey || remain <= 0}
                              onPress={() => setLineAllocMax(id)}
                              style={[
                                ps.miniBtnBase,
                                busyKey || remain <= 0 ? ps.opacity55 : null,
                              ]}
                            >
                              <Text style={ps.maxBtnText}>MAX</Text>
                            </Pressable>
                          </View>

                          <Text
                            testID={`payment-form-line-rest-after-${id}`}
                            style={ps.lineRestAfter}
                          >
                            Оплачено до: <Text style={ps.boldText}>{fmt2(paidBefore)} {cur}</Text>
                            {"  "}• Остаток после: <Text style={ps.boldText}>{fmt2(restAfter)} {cur}</Text>
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {!allocOk ? (
                  <View style={ps.allocWarnBox}>
                    <Text style={ps.boldText}>
                      ✕ Заполните хотя бы одну позицию (сумма должна быть больше 0).
                    </Text>
                  </View>
                ) : null}

                <Text style={ps.allocAutoHint}>
                  Сумма оплаты берётся автоматически из распределения по позициям.
                </Text>
              </View>

              <View style={ps.gap12} />
            </>
          ) : null}

          <TextInput
            value={note}
            onChangeText={setNote}
            editable={!busyKey}
            placeholder="Комментарий"
            placeholderTextColor={UI.sub}
            autoCorrect={false}
            autoCapitalize="none"
            multiline
            onFocus={(e) => scrollInputIntoView(e)}
            style={[
              S.input(true),
              isPayActiveTab ? ps.noteAccent : null,
              ps.minHeight56,
              busyKey ? ps.opacity90 : null,
            ]}
          />

          {payKind === "bank" ? (
            <>
              <View style={ps.gap12} />
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                editable={!busyKey}
                placeholder="Банк"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as object, busyKey ? ps.opacity90 : null]}
              />

              <View style={ps.gap8} />
              <TextInput
                value={bik}
                onChangeText={setBik}
                editable={!busyKey}
                placeholder="БИК"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as object, busyKey ? ps.opacity90 : null]}
              />

              <View style={ps.gap8} />
              <TextInput
                value={rs}
                onChangeText={setRs}
                editable={!busyKey}
                placeholder="Р/С"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as object, busyKey ? ps.opacity90 : null]}
              />

              <View style={ps.gap8} />

              <View style={ps.segRow}>
                <View style={ps.flex1}>
                  <TextInput
                    value={inn}
                    onChangeText={setInn}
                    editable={!busyKey}
                    placeholder="ИНН"
                    placeholderTextColor={UI.sub}
                    keyboardType={kbTypeNum}
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={(e) => scrollInputIntoView(e)}
                    style={[S.input(true), payAccent as object, busyKey ? ps.opacity90 : null]}
                  />
                </View>

                <View style={ps.flex1}>
                  <TextInput
                    value={kpp}
                    onChangeText={setKpp}
                    editable={!busyKey}
                    placeholder="КПП"
                    placeholderTextColor={UI.sub}
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={(e) => scrollInputIntoView(e)}
                    style={[S.input(true), payAccent as object, busyKey ? ps.opacity90 : null]}
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

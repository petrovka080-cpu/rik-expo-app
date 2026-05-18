import { Platform, Pressable, Text, TextInput, View } from "react-native";

import {
  fmt2,
  fmtQty,
  kindOf,
  nnum,
  round2,
} from "../accountant.paymentForm.helpers";
import type { useAccountantPaymentForm } from "../useAccountantPaymentForm";
import { S, UI } from "../ui";
import { ps } from "./ActivePaymentForm.styles";

type PaymentFormModel = ReturnType<typeof useAccountantPaymentForm>;

type ActivePaymentAllocationSectionProps = {
  allocMap: PaymentFormModel["allocMap"];
  allocOk: boolean;
  allocSum: number;
  busyKey: string | null;
  clearAlloc: () => void;
  commitLineInput: PaymentFormModel["commitLineInput"];
  cur: string;
  items: PaymentFormModel["items"];
  itemsLoading: boolean;
  lineInputs: PaymentFormModel["lineInputs"];
  lineTotals: PaymentFormModel["lineTotals"];
  paidBeforeByLine: PaymentFormModel["paidBeforeByLine"];
  paidUnassigned: number;
  paymentDataErrorMessage: string | null;
  remainByLine: PaymentFormModel["remainByLine"];
  scrollInputIntoView: (event: unknown, offset?: number) => void;
  setLineAllocInput: PaymentFormModel["setLineAllocInput"];
  setLineAllocMax: PaymentFormModel["setLineAllocMax"];
};

export function ActivePaymentAllocationSection({
  allocMap,
  allocOk,
  allocSum,
  busyKey,
  clearAlloc,
  commitLineInput,
  cur,
  items,
  itemsLoading,
  lineInputs,
  lineTotals,
  paidBeforeByLine,
  paidUnassigned,
  paymentDataErrorMessage,
  remainByLine,
  scrollInputIntoView,
  setLineAllocInput,
  setLineAllocMax,
}: ActivePaymentAllocationSectionProps) {
  return (
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
  );
}

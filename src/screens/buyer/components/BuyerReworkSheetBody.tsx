import React from "react";
import { View, Text, TextInput, Pressable, type ListRenderItemInfo } from "react-native";

import { FlashList } from "../../../ui/FlashList";
import type { Attachment } from "../buyer.types";
import { D } from "../buyerUi";
import { WideActionButton } from "./common/WideActionButton";
import type { StateSetter, StylesBag } from "./component.types";

type ReworkItem = {
  request_item_id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: string;
  supplier?: string;
  note?: string;
};
function BuyerReworkSheetBodyInner({
  s,

  rwBusy,
  rwPid,
  rwReason,

  rwItems,
  setRwItems,

  rwInvNumber,
  setRwInvNumber,
  rwInvDate,
  setRwInvDate,
  rwInvAmount,
  setRwInvAmount,
  rwInvCurrency,
  setRwInvCurrency,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rwInvFile,
  setRwInvFile,
  rwInvUploadedName,
  pickInvoiceFile,

  rwSaveItems,
  rwSendToDirector,
  rwSendToAccounting,
  closeSheet,
}: {
  s: StylesBag;

  rwBusy: boolean;
  rwPid: string | null;
  rwReason: string;

  rwItems: ReworkItem[];
  setRwItems: StateSetter<ReworkItem[]>;

  rwInvNumber: string;
  setRwInvNumber: (v: string) => void;
  rwInvDate: string;
  setRwInvDate: (v: string) => void;
  rwInvAmount: string;
  setRwInvAmount: (v: string) => void;
  rwInvCurrency: string;
  setRwInvCurrency: (v: string) => void;

  rwInvFile: Attachment["file"] | null;
  setRwInvFile: (v: Attachment["file"] | null) => void;
  rwInvUploadedName: string;
  pickInvoiceFile: () => Promise<Attachment["file"] | null | void>;

  rwSaveItems: () => Promise<void> | void;
  rwSendToDirector: () => Promise<void> | void;
  rwSendToAccounting: () => Promise<void> | void;
  closeSheet: () => void;
}) {
  const listHeader = React.useMemo(
    () => (
      <>
        <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>
          {rwPid ? `Документ: #${rwPid.slice(0, 8)}` : "Документ не выбран"}
        </Text>

        {!!rwReason && (
          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text style={{ fontWeight: "900", color: "#F59E0B" }}>Причина возврата</Text>
            <Text style={{ color: D.text, marginTop: 6, fontWeight: "700" }}>
              {rwReason || "—"}
            </Text>
          </View>
        )}
      </>
    ),
    [rwPid, rwReason],
  );

  const renderItem = React.useCallback(
    ({ item, index }: ListRenderItemInfo<ReworkItem>) => (
      <View
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 18,
          backgroundColor: "rgba(16,24,38,0.92)",
          borderWidth: 1.25,
          borderColor: "rgba(255,255,255,0.16)",
        }}
      >
        <Text style={{ fontWeight: "900", color: D.text }}>
          {item.name_human || `Позиция ${item.request_item_id}`}
        </Text>

        <Text style={{ color: D.sub, fontWeight: "800", marginTop: 6 }}>
          {`${item.qty ?? "—"} ${item.uom ?? ""}`}
        </Text>

        <TextInput
          placeholder="Цена"
          keyboardType="decimal-pad"
          value={item.price ?? ""}
          onChangeText={(v) =>
            setRwItems((prev) =>
              prev.map((x, i) => (i === index ? { ...x, price: v } : x))
            )
          }
          style={[s.input, { marginTop: 10 }]}
        />

        <TextInput
          placeholder="Поставщик"
          value={item.supplier ?? ""}
          onChangeText={(v) =>
            setRwItems((prev) =>
              prev.map((x, i) => (i === index ? { ...x, supplier: v } : x))
            )
          }
          style={[s.input, { marginTop: 10 }]}
        />

        <TextInput
          placeholder="Примечание"
          value={item.note ?? ""}
          onChangeText={(v) =>
            setRwItems((prev) =>
              prev.map((x, i) => (i === index ? { ...x, note: v } : x))
            )
          }
          multiline
          style={[s.input, { marginTop: 10, minHeight: 70 }]}
        />
      </View>
    ),
    [s.input, setRwItems],
  );

  const listEmpty = React.useMemo(
    () => (
      <Text style={{ color: D.sub, fontWeight: "800", marginTop: 10 }}>
        {rwBusy ? "Загрузка…" : "Нет строк в предложении"}
      </Text>
    ),
    [rwBusy],
  );

  const listFooter = React.useMemo(
    () => (
      <>
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>Счёт</Text>

          <TextInput
            placeholder="Номер счёта"
            value={rwInvNumber}
            onChangeText={setRwInvNumber}
            style={[s.input, { marginTop: 6 }]}
          />

          <TextInput
            placeholder="Дата (YYYY-MM-DD)"
            value={rwInvDate}
            onChangeText={setRwInvDate}
            style={[s.input, { marginTop: 6 }]}
          />

          <TextInput
            placeholder="Сумма"
            keyboardType="decimal-pad"
            value={rwInvAmount}
            onChangeText={setRwInvAmount}
            style={[s.input, { marginTop: 6 }]}
          />

          <TextInput
            placeholder="Валюта"
            value={rwInvCurrency}
            onChangeText={setRwInvCurrency}
            style={[s.input, { marginTop: 6 }]}
          />

          <Pressable
            onPress={async () => {
              const f = await pickInvoiceFile();
              if (f) setRwInvFile(f);
            }}
            style={[s.smallBtn, { marginTop: 10 }]}
          >
            <Text style={{ color: D.text, fontWeight: "900" }}>
              {rwInvUploadedName
                ? `Счёт прикреплён: ${rwInvUploadedName}`
                : "Прикрепить счёт"}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <WideActionButton
            label="Сохранить"
            variant="blue"
            disabled={rwBusy}
            onPress={rwSaveItems}
          />

          <WideActionButton
            label="Директору"
            variant="green"
            disabled={rwBusy}
            onPress={rwSendToDirector}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <WideActionButton
            label="Бухгалтеру"
            variant="green"
            disabled={rwBusy}
            onPress={rwSendToAccounting}
          />

          <WideActionButton
            label="Закрыть"
            variant="neutral"
            disabled={rwBusy}
            onPress={closeSheet}
          />
        </View>
      </>
    ),
    [
      closeSheet,
      pickInvoiceFile,
      rwBusy,
      rwInvAmount,
      rwInvCurrency,
      rwInvDate,
      rwInvNumber,
      rwInvUploadedName,
      rwSaveItems,
      rwSendToAccounting,
      rwSendToDirector,
      s.input,
      s.smallBtn,
      setRwInvAmount,
      setRwInvCurrency,
      setRwInvDate,
      setRwInvFile,
      setRwInvNumber,
    ],
  );

  return (
    <FlashList
      data={rwItems}
      estimatedItemSize={164}
      keyExtractor={(item, index) => `${item.request_item_id}-${index}`}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={listFooter}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={8}
      removeClippedSubviews={false}
    />
  );
}

export const BuyerReworkSheetBody = React.memo(BuyerReworkSheetBodyInner);
export { SheetFooterActions } from "./SheetFooterActions";
export { BuyerAttachmentsSticky } from "./BuyerAttachmentsSticky";

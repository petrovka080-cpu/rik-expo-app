import React from "react";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { UI, s } from "./director.styles";
import type { FinSupplierPanelState } from "./director.finance";

type ErrorLike = { message?: unknown };

type Props = {
  visible?: boolean;
  onClose?: () => void;
  loading: boolean;
  periodShort?: string;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf: () => void | Promise<void>;
  supplier: FinSupplierPanelState | null;
  money: (v: number) => string;
  fmtDateOnly: (iso?: string | null) => string;
};

type FlashListLayout = { size?: number };

export default function DirectorFinanceSupplierModal(props: Props) {
  const supplier = props.supplier;
  const amount = Number(supplier?.amount ?? supplier?.toPay ?? 0);
  const invoiceCount = Number(supplier?.count ?? supplier?.invoices.length ?? 0);
  const overdueCount = Number(supplier?.overdueCount ?? 0);
  const criticalCount = Number(supplier?.criticalCount ?? 0);
  const invoices = Array.isArray(supplier?.invoices) ? supplier.invoices : [];

  const invoiceKeyExtractor = React.useCallback(
    (invoice: FinSupplierPanelState["invoices"][number]) => String(invoice.id),
    [],
  );

  const renderInvoiceRow = React.useCallback(
    ({ item: invoice }: { item: FinSupplierPanelState["invoices"][number] }) => (
      <View
        style={[
          s.mobCard,
          {
            marginBottom: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            flexDirection: "column",
            alignItems: "stretch",
          },
        ]}
      >
        <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
          {invoice.title}
        </Text>

        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={3}>
          {props.money(Number(invoice.amount ?? 0))} KGS
          {invoice.isCritical ? " · критично" : invoice.isOverdue ? " · требует оплаты" : ""}
          {invoice.approvedIso ? ` · утв. ${props.fmtDateOnly(invoice.approvedIso)}` : ""}
          {invoice.invoiceIso ? ` · счёт ${props.fmtDateOnly(invoice.invoiceIso)}` : ""}
          {invoice.dueIso ? ` · срок ${props.fmtDateOnly(invoice.dueIso)}` : ""}
        </Text>
      </View>
    ),
    [props],
  );

  const listHeader = React.useMemo(
    () => (
      <View style={[s.reqNoteBox, { borderLeftColor: "#F59E0B" }]}>
        <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
          {`Долг: ${props.money(amount)} KGS · счетов ${invoiceCount}`}
        </Text>
        <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
          {`Требует оплаты: ${overdueCount} · критично: ${criticalCount}`}
        </Text>

        <View style={{ marginTop: 10 }}>
          <Pressable
            disabled={props.loading}
            onPress={async () => {
              if (props.loading) return;
              try {
                await Promise.resolve(props.onPdf());
              } catch (error) {
                const message =
                  error && typeof error === "object" && "message" in error
                    ? String((error as ErrorLike).message ?? error)
                    : String(error);
                if (__DEV__) {
                  console.warn("[director.financeSupplier] pdf failed", message);
                }
              }
            }}
            style={{
              height: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(34,197,94,0.16)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.55)",
              opacity: props.loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: UI.text, fontWeight: "900" }}>{props.loading ? "..." : "Сводка (PDF)"}</Text>
          </Pressable>
        </View>
      </View>
    ),
    [amount, criticalCount, invoiceCount, overdueCount, props],
  );

  if (!supplier) {
    return <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>;
  }

  return (
    <FlashList
      style={{ flex: 1, minHeight: 0 }}
      data={invoices}
      renderItem={renderInvoiceRow}
      keyExtractor={invoiceKeyExtractor}
      overrideItemLayout={(layout: FlashListLayout) => {
        layout.size = 96;
      }}
      ListHeaderComponent={listHeader}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

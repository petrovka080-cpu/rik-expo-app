import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { UI, s } from "./director.styles";
import type { FinKindSupplierRow, FinanceSummary, FinSpendSummary } from "./director.finance";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  periodShort?: string;
  loading: boolean;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;
  sum: FinanceSummary | null | undefined;
  spendSummary: FinSpendSummary;
  money: (v: number) => string;
  onOpenKind?: (kindName: string, list: FinKindSupplierRow[]) => void;
};

const OVERPAY_KIND = "РџРµСЂРµРїР»Р°С‚С‹ / Р°РІР°РЅСЃС‹";

export default function DirectorFinanceSpendModal(props: Props) {
  const [kindsOpen, setKindsOpen] = React.useState(false);

  React.useEffect(() => {
    if (props.visible === false) setKindsOpen(false);
  }, [props.visible]);

  const toggleKindsOpen = React.useCallback(() => {
    setKindsOpen((current) => !current);
  }, []);

  const openOverpayAsKind = React.useCallback(() => {
    props.onOpenKind?.(OVERPAY_KIND, props.spendSummary.overpaySuppliers);
  }, [props]);

  return (
    <ScrollView
      style={{ flex: 1, minHeight: 0 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ flexDirection: "column", alignItems: "stretch" }}>
        <Text style={{ color: UI.text, fontWeight: "900" }}>
          РЈС‚РІРµСЂР¶РґРµРЅРѕ:{" "}
          <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(props.spendSummary.header.approved)}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
          РћРїР»Р°С‡РµРЅРѕ:{" "}
          <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(props.spendSummary.header.paid)}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
          Рљ РѕРїР»Р°С‚Рµ:{" "}
          <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(props.spendSummary.header.toPay)}</Text>
        </Text>

        {props.spendSummary.header.overpay > 0 ? (
          <Pressable onPress={openOverpayAsKind} hitSlop={12}>
            <Text style={{ color: "#F59E0B", fontWeight: "900", marginTop: 8 }}>
              РџРµСЂРµРїР»Р°С‚Р°/Р°РІР°РЅСЃ:{" "}
              <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(props.spendSummary.header.overpay)}</Text>
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={toggleKindsOpen}
          hitSlop={10}
          style={[
            s.mobCard,
            {
              marginTop: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
              Р Р°СЃС…РѕРґС‹ РїРѕ РІРёРґР°Рј
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
              РњР°С‚РµСЂРёР°Р»С‹ В· Р Р°Р±РѕС‚С‹ В· РЈСЃР»СѓРіРё В· Р”СЂСѓРіРѕРµ
            </Text>
          </View>

          <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>{kindsOpen ? "в–ґ" : "в–ѕ"}</Text>
        </Pressable>

        {kindsOpen ? (
          <View style={{ marginTop: 10 }}>
            {!props.spendSummary.kindRows.length ? (
              <Text style={{ color: UI.sub, fontWeight: "800" }}>РќРµС‚ РґР°РЅРЅС‹С…</Text>
            ) : (
              props.spendSummary.kindRows.map((row) => (
                <Pressable
                  key={row.kind}
                  onPress={() => props.onOpenKind?.(row.kind, row.suppliers)}
                  hitSlop={12}
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
                  <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                    {row.kind}
                  </Text>

                  <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={2}>
                    {`РЈС‚РІРµСЂР¶РґРµРЅРѕ: ${props.money(row.approved)} В· РѕРїР»Р°С‡РµРЅРѕ: ${props.money(row.paid)} В· Рє РѕРїР»Р°С‚Рµ: ${props.money(row.toPay)}`}
                  </Text>

                  {row.overpay > 0 ? (
                    <Text style={{ color: "#F59E0B", fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                      {`РџРµСЂРµРїР»Р°С‚Р°/Р°РІР°РЅСЃ: ${props.money(row.overpay)}`}
                    </Text>
                  ) : null}

                  <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                    {`РџРѕСЃС‚Р°РІС‰РёРєРѕРІ: ${row.suppliers.length}`}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

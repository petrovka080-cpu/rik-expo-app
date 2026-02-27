// src/screens/director/DirectorFinanceSpendModal.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "./director.styles";
import { nnum } from "./director.finance";

type SpendRow = {
  proposal_id?: string | null;
  proposal_no?: string | null;
  pretty?: string | null;

  supplier?: string | null;
  kind_code?: string | null;
  kind_name?: string | null;

  approved_alloc?: any;
  paid_alloc_cap?: any;
  overpay_alloc?: any;
};

type Props = {
  // ⚠️ оставляем в типе, чтобы не ломать вызовы, но внутри это уже не модалка
  visible?: boolean;
  onClose?: () => void;

  // ✅ клик по переплате/строке → открыть модалку поставщика (делается в родителе)
  onOpenSupplier?: (supplierName: string) => void;

  periodShort?: string;
  loading: boolean;

  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;

  sum:
    | {
        approved: number;
        paid: number;
        partialPaid: number;
        toPay: number;
        overdueCount: number;
        partialCount: number;
      }
    | null
    | undefined;

  spendRows: SpendRow[];
  money: (v: number) => string;

  onOpenKind?: (kindName: string, list: any[]) => void;
};

export default function DirectorFinanceSpendModal(p: Props) {
  const [kindsOpen, setKindsOpen] = React.useState(false);

  React.useEffect(() => {
    if (p.visible === false) setKindsOpen(false);
  }, [p.visible]);

  const rows: SpendRow[] = Array.isArray(p.spendRows) ? p.spendRows : [];

  const spendHeader = React.useMemo(() => {
    let approved = 0;
    let paid = 0;
    let overpay = 0;

    // "к оплате" по предложениям (чтобы не задваивалось)
    const byProposal = new Map<string, { approved: number; paid: number }>();

    for (const r of rows) {
      const pid = String(r?.proposal_id ?? "").trim();
      const a = nnum(r?.approved_alloc);
      const p2 = nnum(r?.paid_alloc_cap);
      const o = nnum(r?.overpay_alloc);

      approved += a;
      paid += p2;
      overpay += o;

      if (pid) {
        const cur = byProposal.get(pid) ?? { approved: 0, paid: 0 };
        cur.approved += a;
        cur.paid += p2;
        byProposal.set(pid, cur);
      }
    }

    let toPay = 0;
    for (const v of byProposal.values()) toPay += Math.max(v.approved - v.paid, 0);

    return { approved, paid, toPay, overpay };
  }, [rows]);

  const kindTotals = React.useMemo(() => {
    const map = new Map<string, { approved: number; paid: number; overpay: number }>();

    for (const r of rows) {
      const kind = String(r?.kind_name ?? "Другое");
      const approved = nnum(r?.approved_alloc);
      const paid = nnum(r?.paid_alloc_cap);
      const overpay = nnum(r?.overpay_alloc);

      const cur = map.get(kind) ?? { approved: 0, paid: 0, overpay: 0 };
      cur.approved += approved;
      cur.paid += paid;
      cur.overpay += overpay;
      map.set(kind, cur);
    }

    const order = ["Материалы", "Работы", "Услуги", "Другое"];
    const out = order
      .filter((k) => map.has(k))
      .map((k) => ({ kind: k, ...map.get(k)! }))
      .filter((x) => x.approved !== 0 || x.paid !== 0 || x.overpay !== 0);

    for (const [k, v] of map.entries()) {
      if (order.includes(k)) continue;
      out.push({ kind: k, ...v });
    }

    return out;
  }, [rows]);

  const suppliersByKind = React.useMemo(() => {
    const res: Record<
      string,
      { supplier: string; approved: number; paid: number; overpay: number; count: number }[]
    > = {};
    const maps: Record<string, Map<string, { approved: number; paid: number; overpay: number; count: number }>> = {};

    for (const r of rows) {
      const kind = String(r?.kind_name ?? "Другое");
      const supplier = String(r?.supplier ?? "—").trim() || "—";

      const approved = nnum(r?.approved_alloc);
      const paid = nnum(r?.paid_alloc_cap);
      const overpay = nnum(r?.overpay_alloc);

      if (!maps[kind]) maps[kind] = new Map();
      const cur = maps[kind].get(supplier) ?? { approved: 0, paid: 0, overpay: 0, count: 0 };
      cur.approved += approved;
      cur.paid += paid;
      cur.overpay += overpay;
      cur.count += 1;
      maps[kind].set(supplier, cur);
    }

    for (const kind of Object.keys(maps)) {
      const arr = Array.from(maps[kind].entries()).map(([supplier, v]) => ({
        supplier,
        approved: v.approved,
        paid: v.paid,
        overpay: v.overpay,
        count: v.count,
      }));
      arr.sort((a, b) => b.approved - a.approved);
      res[kind] = arr;
    }

    return res;
  }, [rows]);

  const overpayTotal = React.useMemo(() => {
    let s1 = 0;
    for (const r of rows) s1 += nnum(r?.overpay_alloc);
    return s1;
  }, [rows]);

  const anyOverpay = overpayTotal > 0;

  // ✅ PROD: переплаты открываем как "вид" (без вложенной modal)
  const openOverpayAsKind = React.useCallback(() => {
    const map = new Map<string, { supplier: string; approved: number; paid: number; overpay: number; count: number }>();

    for (const r of rows) {
      const overpay = nnum(r?.overpay_alloc);
      if (overpay <= 0) continue;

      const supplier = String(r?.supplier ?? "—").trim() || "—";
      const cur = map.get(supplier) ?? { supplier, approved: 0, paid: 0, overpay: 0, count: 0 };
      cur.overpay += overpay;
      cur.count += 1;
      map.set(supplier, cur);
    }

    const arr = Array.from(map.values()).sort((a, b) => b.overpay - a.overpay);
    p.onOpenKind?.("Переплаты / авансы", arr);
  }, [rows, p.onOpenKind]);

  return (
    <View style={{ flexDirection: "column", alignItems: "stretch" }}>
      <Text style={{ color: UI.text, fontWeight: "900" }}>
        Утверждено: <Text style={{ color: UI.sub }}>{p.loading ? "…" : p.money(spendHeader.approved)}</Text>
      </Text>

      <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
        Оплачено: <Text style={{ color: UI.sub }}>{p.loading ? "…" : p.money(spendHeader.paid)}</Text>
      </Text>

      <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
        К оплате: <Text style={{ color: UI.sub }}>{p.loading ? "…" : p.money(spendHeader.toPay)}</Text>
      </Text>

      {spendHeader.overpay > 0 ? (
        <Pressable onPress={openOverpayAsKind} hitSlop={12}>
          <Text style={{ color: "#F59E0B", fontWeight: "900", marginTop: 8 }}>
            ⚠️ Переплата/аванс:{" "}
            <Text style={{ color: UI.sub }}>{p.loading ? "…" : p.money(spendHeader.overpay)}</Text>
          </Text>
        </Pressable>
      ) : null}

      {/* Заголовок видов */}
      <Pressable
        onPress={() => setKindsOpen((v) => !v)}
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
            Расходы по видам
          </Text>
          <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
            Материалы · Работы · Услуги · Другое
          </Text>
        </View>

        <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>
          {kindsOpen ? "▴" : "▾"}
        </Text>
      </Pressable>

      {/* Виды */}
      {kindsOpen ? (
        <View style={{ marginTop: 10 }}>
          {!kindTotals.length ? (
            <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
          ) : (
            kindTotals.map((x) => {
              const list = suppliersByKind[x.kind] || [];
              const toPay = Math.max(x.approved - x.paid, 0);

              return (
                <Pressable
                  key={x.kind}
                  onPress={() => p.onOpenKind?.(x.kind, list)}
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
                  <Text
                    style={{ color: UI.text, fontWeight: "900", textAlign: "left", alignSelf: "flex-start" }}
                    numberOfLines={1}
                  >
                    {x.kind}
                  </Text>

                  <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={2}>
                    Утверждено: {p.money(x.approved)} · оплачено: {p.money(x.paid)}
                    {x.overpay > 0 ? ` · переплата ${p.money(x.overpay)}` : ""}
                  </Text>

                  <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                    К оплате: {p.money(toPay)} · поставщиков: {list.length}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      {/* Переплаты — кнопка как “вид”, без второй модалки */}
      {anyOverpay ? (
  <Pressable
    onPress={openOverpayAsKind}
    hitSlop={12}
    style={[
      s.mobCard,
      {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
    ]}
  >

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: "#F59E0B", fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
              ⚠️ Переплаты / авансы
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
              Всего: {p.money(overpayTotal)}
            </Text>
          </View>

          <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

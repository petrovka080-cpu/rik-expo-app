import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { S, UI } from "../ui";
import { supabase } from "../../../lib/supabaseClient";

type AllocRow = { proposal_item_id: string; amount: number };
type Mode = "full" | "partial";

const nnum = (v: any) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v: number) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

function allocProportional(totalAmount: number, weights: number[]) {
  const total = Math.max(0, nnum(totalAmount));
  const ws = (weights || []).map((x) => Math.max(0, nnum(x)));
  const sumW = ws.reduce((a, b) => a + b, 0);
  const out = ws.map(() => 0);
  if (!total || sumW <= 0) return out;

  let acc = 0;
  for (let i = 0; i < ws.length; i++) {
    if (i === ws.length - 1) out[i] = round2(total - acc);
    else {
      const v = round2((total * ws[i]) / sumW);
      out[i] = v;
      acc = round2(acc + v);
    }
  }
  return out;
}

function fmt2(v: any) {
  const n = nnum(v);
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtQty(v: any) {
  const n = nnum(v);
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

type Item = {
  id: string; // у тебя bigint в БД, но в UI приходит строкой — ок
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  rik_code?: string | null;
};

function kindOf(it: Item) {
  const c = String(it?.rik_code ?? "").toUpperCase();
  if (c.startsWith("MAT-")) return "Материалы";
  if (c.startsWith("WRK-")) return "Работы";
  if (c.startsWith("SRV-") || c.startsWith("SVC-")) return "Услуги";
  return "Прочее";
}

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
}: any) {
  const proposalId = String(current?.proposal_id ?? "").trim();
  const cur = current?.invoice_currency || "KGS";

useEffect(() => {
  setAllocRows([]);
  if (modeRef.current === "partial") setAmount("");
}, [proposalId]);

  const inv = Number(current?.invoice_amount ?? 0);
  const paid = Number(current?.total_paid ?? 0);
  const restProposal = inv > 0 ? Math.max(0, inv - paid) : 0;

  const [mode, setMode] = useState<Mode>("full");
  const modeRef = useRef<Mode>("full");
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const lastPidRef = useRef<string>("");

  useEffect(() => {
    const pid = proposalId;
    if (!pid) {
      setItems([]);
      return;
    }
    if (lastPidRef.current === pid) return;
    lastPidRef.current = pid;

    (async () => {
      setItemsLoading(true);
      try {
        const q = await supabase
          .from("proposal_items")
          .select("id, name_human, uom, qty, price, rik_code")
          .eq("proposal_id", pid)
          .order("id", { ascending: true });

        if (q.error) throw q.error;
        setItems(Array.isArray(q.data) ? (q.data as any) : []);
      } catch {
        setItems([]);
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [proposalId]);

const [paidByLineMap, setPaidByLineMap] = useState<Map<string, number>>(new Map());
const [paidKnownSum, setPaidKnownSum] = useState(0);

useEffect(() => {
  const pid = proposalId;
  if (!pid) {
    setPaidByLineMap(new Map());
    setPaidKnownSum(0);
    return;
  }

  (async () => {
    try {
      // allocations -> payments (inner) -> proposal_id
      const q = await supabase
        .from("proposal_payment_allocations")
        .select("proposal_item_id, amount, proposal_payments!inner(proposal_id)")
        .eq("proposal_payments.proposal_id", pid);

      if (q.error) throw q.error;

      const m = new Map<string, number>();
      let sum = 0;

      for (const r of (q.data || []) as any[]) {
        const k = String(r?.proposal_item_id ?? "").trim();
        const a = round2(nnum(r?.amount));
        if (!k || a <= 0) continue;

        m.set(k, round2((m.get(k) ?? 0) + a));
        sum = round2(sum + a);
      }

      setPaidByLineMap(m);
      setPaidKnownSum(sum);
    } catch {
      setPaidByLineMap(new Map());
      setPaidKnownSum(0);
    }
  })();
}, [proposalId]);

  const lineTotals = useMemo(() => {
    return (items || []).map((it) => round2(nnum(it.qty) * nnum(it.price)));
  }, [items]);


const paidTotalProposal = useMemo(() => {
  return round2(Math.max(0, nnum(current?.total_paid)));
}, [current]);

const paidBeforeByLine = useMemo(() => {
  return (items || []).map((it: any, i: number) => {
    const id = String(it?.id ?? "").trim(); // proposal_items.id
    const paidLine = round2(nnum(paidByLineMap.get(id) ?? 0));
    return Math.min(paidLine, lineTotals[i] || 0);
  });
}, [items, paidByLineMap, lineTotals]);

const paidUnassigned = useMemo(() => {
  
  return round2(Math.max(0, paidTotalProposal - paidKnownSum));
}, [paidTotalProposal, paidKnownSum]);

  const remainByLine = useMemo(() => {
    return lineTotals.map((t, i) => round2(Math.max(0, t - nnum(paidBeforeByLine[i]))));
  }, [lineTotals, paidBeforeByLine]);

  const remainTotal = useMemo(() => {
    return round2(remainByLine.reduce((s, x) => s + nnum(x), 0));
  }, [remainByLine]);


  const allocMap = useMemo(() => {
    const m = new Map<string, number>();
    (allocRows || []).forEach((r: AllocRow) => m.set(String(r.proposal_item_id), nnum(r.amount)));
    return m;
  }, [allocRows]);

  const allocSum = useMemo(() => {
    return round2((allocRows || []).reduce((s: number, r: AllocRow) => s + nnum(r.amount), 0));
  }, [allocRows]);

  // ===== синхронизация суммы =====
  // partial: сумма = сумма по позициям (read-only)
  useEffect(() => {
    if (modeRef.current !== "partial") return;
    const next = round2(allocSum);
    const now = round2(nnum(amount));
    if (Math.abs(next - now) <= 0.005) return;
    setAmount(next > 0 ? String(next.toFixed(2)) : "");
  }, [allocSum, amount, setAmount]);

  // ===== валидация для onPayConfirm (allocOk) =====
  const allocOk = useMemo(() => {
    if (!proposalId) return true;
    if (itemsLoading) return false;

    if (mode === "full") {
      // полный платёж: всё что осталось должно распределиться полностью
      if (restProposal <= 0) return false;
      // если items пустые — пропускаем (не блокируем), но обычно items есть
      if (!items.length) return true;
      // требуем чтобы распределение совпало с rest (или пустое, если ещё не нажали кнопку)
      if (allocRows?.length) return Math.abs(round2(allocSum - restProposal)) <= 0.01;
      return true; // дадим нажать “Провести” — но ниже мы автозаполним в one-click кнопкой
    }

    // partial: надо чтобы было >0 и не превышало общий остаток
    if (allocSum <= 0) return false;
    if (allocSum - remainTotal > 0.01) return false;
    return true;
  }, [proposalId, mode, restProposal, itemsLoading, items.length, allocRows, allocSum, remainTotal]);

  useEffect(() => {
    try {
      onAllocStatus?.(allocOk, allocSum);
    } catch {}
  }, [allocOk, allocSum, onAllocStatus]);

  // ===== helpers: set line allocation with clamp =====
  const setLineAlloc = (itemId: string, val: number) => {
    const id = String(itemId);
    const next = new Map(allocMap);

    const idx = (items || []).findIndex((x) => String(x.id) === id);
    const max = idx >= 0 ? Math.max(0, nnum(remainByLine[idx])) : 0;

    const v0 = round2(Math.max(0, nnum(val)));
    const v = Math.min(v0, max);

    if (v <= 0) next.delete(id);
    else next.set(id, v);

    const out: AllocRow[] = Array.from(next.entries()).map(([proposal_item_id, amount]) => ({
      proposal_item_id,
      amount: round2(amount),
    }));
    setAllocRows(out);
  };

  const clearAlloc = () => setAllocRows([]);

  const applyFullAlloc = () => {
    if (!proposalId) return;
    if (!items.length) {
      // если вдруг нет строк — просто ставим сумму остатка
      setAmount(restProposal > 0 ? String(restProposal.toFixed(2)) : "");
      setAllocRows([]);
      return;
    }

    const out: AllocRow[] = [];
    for (let i = 0; i < items.length; i++) {
      const id = String(items[i]?.id ?? "");
      const rem = round2(Math.max(0, nnum(remainByLine[i])));
      if (id && rem > 0) out.push({ proposal_item_id: id, amount: rem });
    }
    setAllocRows(out);
    setAmount(restProposal > 0 ? String(restProposal.toFixed(2)) : "");
  };
useEffect(() => {
  if (modeRef.current !== "full") return;
  if (!allocRows?.length) return;

  const sum = round2(
    (allocRows || []).reduce((s: number, r: any) => s + nnum(r.amount), 0)
  );

  if (Math.abs(sum - restProposal) > 0.01) {
    try {
      applyFullAlloc();
    } catch {}
  }
}, [restProposal]);
  
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

  // ====== RETURN ======
  return (
    <>
      <View style={S.section}>
        <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 6 }}>
          ФИО бухгалтера (обязательно)
        </Text>

        <TextInput
          value={accountantFio}
          onChangeText={setAccountantFio}
          placeholder="Иванов Иван Иванович"
          placeholderTextColor={UI.sub}
          onFocus={(e) => scrollInputIntoView(e)}
          style={S.input(!!String(accountantFio || "").trim())}
        />

        <View style={{ height: 10 }} />

        {/* ===== НОМЕР/ДАТА/ПОСТАВЩИК ===== */}
        {(() => {
          const invNoServer = String(current?.invoice_number ?? "").trim();
          const invDtServer = String(current?.invoice_date ?? "").trim();
          const suppServer = String(current?.supplier ?? "").trim();

          const invNo0 = String((invoiceNo || invNoServer) ?? "").trim();
          const invDt0 = String((invoiceDate || invDtServer) ?? "").trim();
          const supp0 = String((supplierName || suppServer) ?? "").trim();

          return (
            <>
              <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 6 }}>
                Оплата по счёту
              </Text>

              {supp0 ? (
                <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 8 }} numberOfLines={1}>
                  Поставщик: <Text style={{ color: UI.text, fontWeight: "900" }}>{supp0}</Text>
                </Text>
              ) : null}

              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                Номер счёта (инвойса)
              </Text>

              <TextInput
                value={invNo0}
                onChangeText={(t) => setInvoiceNo(String(t || "").trimStart())}
                editable={!busyKey}
                placeholder="Например: 125/01"
                placeholderTextColor={UI.sub}
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 10 }} />

              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                Дата счёта
              </Text>

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
                  <Text style={{ color: UI.text, fontWeight: "900" }}>Сегодня</Text>
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
                  <Text style={{ color: UI.text, fontWeight: "900" }}>Вчера</Text>
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
                    if (d.length === 2) setTimeout(() => ddRef?.current?.focus?.(), 0);
                  }}
                  onBlur={() => setInvMM((x: any) => clamp2(x, 12))}
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
                  onBlur={() => setInvDD((x: any) => clamp2(x, 31))}
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

        {/* ===== ОПЛАТА ===== */}
        <View style={S.section}>
          <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 10 }}>Оплата</Text>

          {/* Способ оплаты */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable disabled={!!busyKey} onPress={() => setPayKind("bank")} style={segBtn(payKind === "bank")}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>Банк</Text>
            </Pressable>

            <Pressable disabled={!!busyKey} onPress={() => setPayKind("cash")} style={segBtn(payKind === "cash")}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>Нал</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />

          {/* Остаток */}
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
              <Text style={{ color: UI.sub, fontWeight: "800" }}>Остаток к оплате</Text>
              <Text style={{ color: UI.text, fontWeight: "900", fontSize: 22, marginTop: 6 }}>
                {restProposal.toFixed(2)} {cur}
              </Text>
            </View>
          ) : null}

          {/* Режим: полностью / частично */}
          {proposalId ? (
            <>
              <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 8 }}>
                Режим оплаты
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  disabled={!!busyKey}
                  onPress={() => {
  setMode("full");
setAllocRows([]);
    setTimeout(() => {
    try { applyFullAlloc(); } catch {}
  }, 0);
}}

                  style={segBtn(mode === "full")}
                >
                  <Text style={{ color: UI.text, fontWeight: "900" }}>Оплатить полностью</Text>
                </Pressable>

                <Pressable
                  disabled={!!busyKey}
                  onPress={() => {
                    setMode("partial");
                    setAmount("");
                    setAllocRows([]);
                  }}
                  style={segBtn(mode === "partial")}
                >
                  <Text style={{ color: UI.text, fontWeight: "900" }}>Оплатить частично</Text>
                </Pressable>
              </View>

              <View style={{ height: 12 }} />
            </>
          ) : null}


{proposalId && mode === "full" ? (
  <>
    <View style={pillBox()}>
      <Text style={pillBoxTxt()}>
        Сумма к оплате:{" "}
        <Text style={{ color: UI.text, fontWeight: "900" }}>
          {restProposal.toFixed(2)} {cur}
        </Text>
      </Text>
    </View>

    <View style={{ height: 8 }} />

    <Text style={{ color: UI.sub, fontWeight: "800" }}>
      В этом режиме поля по позициям не нужны — всё закроется по остаткам.
    </Text>

    <View style={{ height: 12 }} />
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
    <Text style={{ fontWeight: "900", color: UI.text }}>Распределение по позициям</Text>

    <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
      Сумма к оплате (авто):{" "}
      <Text style={{ color: UI.text, fontWeight: "900" }}>
        {fmt2(allocSum)} {cur}
      </Text>
    </Text>

    {paidUnassigned > 0.01 ? (
      <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
        Не распределено ранее:{" "}
        <Text style={{ color: UI.text, fontWeight: "900" }}>
          {fmt2(paidUnassigned)} {cur}
        </Text>
      </Text>
    ) : null}
  </View>

  <View style={{ flexDirection: "row", gap: 8 }}>
    <Pressable
      disabled={!!busyKey}
      onPress={clearAlloc}
      style={smallBtn("neutral", !!busyKey)}
    >
      <Text style={{ color: UI.text, fontWeight: "900" }}>Очистить</Text>
    </Pressable>
  </View>
</View>

                <View style={{ height: 10 }} />

                {itemsLoading ? (
                  <Text style={{ color: UI.sub, fontWeight: "800" }}>Загружаю позиции…</Text>
                ) : !items.length ? (
                  <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет позиций у счёта</Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {items.map((it, idx) => {
                      const id = String(it.id);
                      const name = String(it.name_human ?? "—");
                      const uom = String(it.uom ?? "");
                      const qty = nnum(it.qty);
                      const price = nnum(it.price);
                      const total = lineTotals[idx] || 0;

                      const paidBefore = nnum(paidBeforeByLine[idx]);
                      const remain = nnum(remainByLine[idx]);

                      const thisPay = nnum(allocMap.get(id) ?? 0);
                      const restAfter = round2(Math.max(0, total - (paidBefore + thisPay)));

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
                            {kindOf(it)} • {fmtQty(qty)} {uom} × {fmt2(price)}
                          </Text>

                          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                            Остаток по позиции:{" "}
                            <Text style={{ color: UI.text, fontWeight: "900" }}>{fmt2(remain)} {cur}</Text>
                          </Text>

                          <View style={{ height: 8 }} />

                          <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
                            Этим платежом по позиции
                          </Text>

                          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <TextInput
                              value={thisPay ? String(thisPay) : ""}
                              onChangeText={(t) => setLineAlloc(id, nnum(t))}
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
                              disabled={!!busyKey || remain <= 0}
                              onPress={() => setLineAlloc(id, remain)}
                              style={miniBtn(!!busyKey || remain <= 0)}
                            >
                              <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>MAX</Text>
                            </Pressable>
                          </View>

                          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
                            Оплачено до: <Text style={{ color: UI.text, fontWeight: "900" }}>{fmt2(paidBefore)} {cur}</Text>
                            {"  "}• Остаток после: <Text style={{ color: UI.text, fontWeight: "900" }}>{fmt2(restAfter)} {cur}</Text>
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
                      ❗ Заполните хотя бы одну позицию (сумма должна быть больше 0).
                    </Text>
                  </View>
                ) : null}

                <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 10 }}>
                  Сумма оплаты берётся автоматически из распределения по позициям.
                </Text>
              </View>

              <View style={{ height: 12 }} />
            </>
          ) : null}

          {/* ===== КОММЕНТАРИЙ ===== */}
          <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 6 }}>
            Комментарий (необязательно)
          </Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            editable={!busyKey}
            placeholder="Комментарий к платежу"
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

          {/* ===== РЕКВИЗИТЫ (только банк) ===== */}
          {payKind === "bank" ? (
            <>
              <View style={{ height: 12 }} />
              <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 8 }}>
                Реквизиты банка
              </Text>

              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>Банк</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                editable={!busyKey}
                placeholder="Название банка"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as any, { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 8 }} />

              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>БИК</Text>
              <TextInput
                value={bik}
                onChangeText={setBik}
                editable={!busyKey}
                placeholder="БИК"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as any, { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 8 }} />

              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>Р/С</Text>
              <TextInput
                value={rs}
                onChangeText={setRs}
                editable={!busyKey}
                placeholder="Расчётный счёт"
                placeholderTextColor={UI.sub}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={(e) => scrollInputIntoView(e)}
                style={[S.input(true), payAccent as any, { opacity: busyKey ? 0.9 : 1 }]}
              />

              <View style={{ height: 8 }} />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>ИНН</Text>
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
                    style={[S.input(true), payAccent as any, { opacity: busyKey ? 0.9 : 1 }]}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>КПП</Text>
                  <TextInput
                    value={kpp}
                    onChangeText={setKpp}
                    editable={!busyKey}
                    placeholder="КПП (если нужно)"
                    placeholderTextColor={UI.sub}
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={(e) => scrollInputIntoView(e)}
                    style={[S.input(true), payAccent as any, { opacity: busyKey ? 0.9 : 1 }]}
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

// маленький “инфо-пилл”
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
  return { color: UI.sub, fontWeight: "800" } as any;
}


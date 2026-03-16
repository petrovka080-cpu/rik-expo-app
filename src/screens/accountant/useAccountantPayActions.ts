import { useCallback } from "react";
import { Alert, Platform } from "react-native";
import { supabase } from "../../lib/supabaseClient";

type AllocRow = { proposal_item_id: string; amount: number };
type RowBase = { proposal_id?: string | number; invoice_amount?: number | null; total_paid?: number | null };

type Params<T extends RowBase> = {
  canAct: boolean;
  current: T | null;
  amount: string;
  accountantFio: string;
  payKind: "bank" | "cash";
  note: string;
  allocRows: AllocRow[];
  allocOk: boolean;
  purposePrefix: string;
  persistInvoiceMetaIfNeeded: (proposalId: string) => Promise<void>;
  afterPaymentSync: (proposalId: string) => Promise<unknown>;
  closeCard: () => void;
  setCurrentPaymentId: (id: number | null) => void;
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  safeAlert: (title: string, msg: string) => void;
  errText: (e: unknown) => string;
};

export function useAccountantPayActions<T extends RowBase>(p: Params<T>) {
  const EPS = 0.01;

  const showPaymentFailure = useCallback((title: string, e: unknown) => {
    const msg = p.errText(e);
    p.safeAlert(title, msg);
    console.error("[accountant.payment]", msg);
  }, [p]);

  const showPaymentSyncWarning = useCallback((e: unknown) => {
    p.safeAlert(
      "Оплата проведена с предупреждением",
      `Платеж сохранен, но обновление экрана не завершилось: ${p.errText(e)}`,
    );
    console.error("[accountant.payment.sync]", e);
  }, [p]);

  const payRest = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("РќРµС‚ РїСЂР°РІ", "РќСѓР¶РЅР° СЂРѕР»СЊ В«accountantВ».");
      return;
    }
    if (!p.current?.proposal_id) return;

    try {
      const sum = Number(p.current?.invoice_amount ?? 0);
      const paid = Number(p.current?.total_paid ?? 0);
      const rest = sum > 0 ? Math.max(0, sum - paid) : 0;
      if (!rest || rest <= 0) {
        p.safeAlert("РћСЃС‚Р°С‚РѕРє", "РќРµС‚ СЃСѓРјРјС‹ Рє РѕРїР»Р°С‚Рµ.");
        return;
      }

      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("Р¤РРћ Р±СѓС…РіР°Р»С‚РµСЂР°", "РџРѕР»Рµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ");
        return;
      }

      const pidMeta = String(p.current?.proposal_id ?? "").trim();
      if (pidMeta) await p.persistInvoiceMetaIfNeeded(pidMeta);

      const { data: payId, error } = await supabase.rpc("acc_add_payment_v3_uuid", {
        p_proposal_id: String(p.current.proposal_id),
        p_amount: rest,
        p_accountant_fio: fio,
        p_purpose: `${p.purposePrefix} ${p.note || ""}`.trim(),
        p_method: p.payKind === "bank" ? "Р±Р°РЅРє" : "РЅР°Р»",
        p_note: p.note?.trim() ? p.note.trim() : null,
        p_allocations: p.allocRows,
      });
      if (error) throw error;
      if (payId) p.setCurrentPaymentId(Number(payId));

      const pid = String(p.current?.proposal_id ?? "").trim();
      try {
        await p.afterPaymentSync(pid);
      } catch (e: unknown) {
        showPaymentSyncWarning(e);
        return;
      }

      if (pid) p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));
      p.safeAlert("Р“РѕС‚РѕРІРѕ", "РћРїР»Р°С‚Р° РїСЂРѕРІРµРґРµРЅР°.");
      p.closeCard();
    } catch (e: unknown) {
      showPaymentFailure("Ошибка оплаты", e);
    }
  }, [p, showPaymentFailure, showPaymentSyncWarning]);

  const addPayment = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("РќРµС‚ РїСЂР°РІ", "РќСѓР¶РЅР° СЂРѕР»СЊ В«accountantВ».");
      return;
    }
    if (!p.current?.proposal_id) return;

    const val = Number(String(p.amount).replace(",", "."));
    if (!val || val <= 0) {
      p.safeAlert("Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ", "РЎСѓРјРјР° РѕРїР»Р°С‚С‹ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0");
      return;
    }

    try {
      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("Р¤РРћ Р±СѓС…РіР°Р»С‚РµСЂР°", "РџРѕР»Рµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ");
        return;
      }

      const inv0 = Number(p.current?.invoice_amount ?? 0);
      const paid0 = Number(p.current?.total_paid ?? 0);
      const rest0 = inv0 > 0 ? Math.max(0, inv0 - paid0) : 0;

      if (rest0 > EPS && Math.abs(val - rest0) <= EPS) {
        const ok =
          Platform.OS === "web"
            ? window.confirm("РЎСѓРјРјР° СЂР°РІРЅР° РѕСЃС‚Р°С‚РєСѓ. РџСЂРѕРІРµСЃС‚Рё РѕРїР»Р°С‚Сѓ РєР°Рє РџРћР›РќРЈР®?")
            : await new Promise<boolean>((resolve) => {
                Alert.alert(
                  "РџРѕС‡С‚Рё РїРѕР»РЅР°СЏ РѕРїР»Р°С‚Р°",
                  "РЎСѓРјРјР° СЂР°РІРЅР° РѕСЃС‚Р°С‚РєСѓ. РџСЂРѕРІРµСЃС‚Рё РєР°Рє РїРѕР»РЅСѓСЋ РѕРїР»Р°С‚Сѓ?",
                  [
                    { text: "РќРµС‚", style: "cancel", onPress: () => resolve(false) },
                    { text: "Р”Р°", style: "default", onPress: () => resolve(true) },
                  ],
                );
              });
        if (ok) {
          await payRest();
          return;
        }
      }

      const pidMeta = String(p.current?.proposal_id ?? "").trim();
      if (pidMeta) await p.persistInvoiceMetaIfNeeded(pidMeta);

      const { data: payId, error } = await supabase.rpc("acc_add_payment_v3_uuid", {
        p_proposal_id: String(p.current.proposal_id),
        p_amount: val,
        p_accountant_fio: fio,
        p_purpose: `${p.purposePrefix} ${p.note || ""}`.trim(),
        p_method: p.payKind === "bank" ? "Р±Р°РЅРє" : "РЅР°Р»",
        p_note: p.note?.trim() ? p.note.trim() : null,
        p_allocations: Array.isArray(p.allocRows) ? p.allocRows : [],
      });
      if (error) throw error;
      if (payId) p.setCurrentPaymentId(Number(payId));

      const pid = String(p.current?.proposal_id ?? "").trim();
      try {
        await p.afterPaymentSync(pid);
      } catch (e: unknown) {
        showPaymentSyncWarning(e);
        return;
      }

      if (pid) p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));
      p.safeAlert("РћРїР»Р°С‚Р° РґРѕР±Р°РІР»РµРЅР°", "РЎС‚Р°С‚СѓСЃ РѕР±РЅРѕРІР»С‘РЅ РїРѕ С„Р°РєС‚Сѓ РѕРїР»Р°С‚С‹.");
      p.closeCard();
    } catch (e: unknown) {
      showPaymentFailure("РћС€РёР±РєР° РѕРїР»Р°С‚С‹", e);
    }
  }, [p, payRest, showPaymentFailure, showPaymentSyncWarning]);

  const onPayConfirm = useCallback(async () => {
    const v = Number(String(p.amount).replace(",", "."));
    if (!v || v <= 0) {
      p.safeAlert("РћРїР»Р°С‚Р°", "Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ РѕРїР»Р°С‚С‹");
      return;
    }
    if (!p.allocOk) {
      p.safeAlert(
        "РћРїР»Р°С‚Р°",
        "РЎРЅР°С‡Р°Р»Р° СЂР°СЃРїСЂРµРґРµР»РёС‚Рµ СЃСѓРјРјСѓ РїРѕ РїРѕР·РёС†РёСЏРј: СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ СЂР°РІРЅРѕ СЃСѓРјРјРµ РїР»Р°С‚РµР¶Р°.",
      );
      return;
    }

    const ok =
      Platform.OS === "web"
        ? window.confirm(`РџСЂРѕРІРµСЃС‚Рё РѕРїР»Р°С‚Сѓ РЅР° СЃСѓРјРјСѓ ${v}?`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РѕРїР»Р°С‚Сѓ",
              `Р’С‹ РІРІРµР»Рё СЃСѓРјРјСѓ: ${v}. РџСЂРѕРІРµСЃС‚Рё РѕРїР»Р°С‚Сѓ?`,
              [
                { text: "РћС‚РјРµРЅР°", style: "cancel", onPress: () => resolve(false) },
                { text: "РџСЂРѕРІРµСЃС‚Рё", style: "default", onPress: () => resolve(true) },
              ],
            );
          });

    if (!ok) return;
    await addPayment();
  }, [p, addPayment]);

  return { payRest, addPayment, onPayConfirm };
}

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

  const payRest = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Нет прав", "Нужна роль «accountant».");
      return;
    }
    if (!p.current?.proposal_id) return;

    const sum = Number(p.current?.invoice_amount ?? 0);
    const paid = Number(p.current?.total_paid ?? 0);
    const rest = sum > 0 ? Math.max(0, sum - paid) : 0;
    if (!rest || rest <= 0) {
      p.safeAlert("Остаток", "Нет суммы к оплате.");
      return;
    }

    const fio = p.accountantFio.trim();
    if (!fio) {
      p.safeAlert("ФИО бухгалтера", "Поле обязательно");
      return;
    }

    const pidMeta = String(p.current?.proposal_id ?? "").trim();
    if (pidMeta) await p.persistInvoiceMetaIfNeeded(pidMeta);

    const { data: payId, error } = await supabase.rpc("acc_add_payment_v3_uuid", {
      p_proposal_id: String(p.current.proposal_id),
      p_amount: rest,
      p_accountant_fio: fio,
      p_purpose: `${p.purposePrefix} ${p.note || ""}`.trim(),
      p_method: p.payKind === "bank" ? "банк" : "нал",
      p_note: p.note?.trim() ? p.note.trim() : null,
      p_allocations: p.allocRows,
    });
    if (error) throw error;
    if (payId) p.setCurrentPaymentId(Number(payId));

    p.safeAlert("Готово", "Оплата проведена.");
    const pid = String(p.current?.proposal_id ?? "").trim();
    if (pid) p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));

    await p.afterPaymentSync(pid);
    p.closeCard();
  }, [p]);

  const addPayment = useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Нет прав", "Нужна роль «accountant».");
      return;
    }
    if (!p.current?.proposal_id) return;

    const val = Number(String(p.amount).replace(",", "."));
    if (!val || val <= 0) {
      p.safeAlert("Введите сумму", "Сумма оплаты должна быть больше 0");
      return;
    }

    try {
      const fio = p.accountantFio.trim();
      if (!fio) {
        p.safeAlert("ФИО бухгалтера", "Поле обязательно");
        return;
      }

      const inv0 = Number(p.current?.invoice_amount ?? 0);
      const paid0 = Number(p.current?.total_paid ?? 0);
      const rest0 = inv0 > 0 ? Math.max(0, inv0 - paid0) : 0;

      if (rest0 > EPS && Math.abs(val - rest0) <= EPS) {
        const ok =
          Platform.OS === "web"
            ? window.confirm("Сумма равна остатку. Провести оплату как ПОЛНУЮ?")
            : await new Promise<boolean>((resolve) => {
                Alert.alert(
                  "Почти полная оплата",
                  "Сумма равна остатку. Провести как полную оплату?",
                  [
                    { text: "Нет", style: "cancel", onPress: () => resolve(false) },
                    { text: "Да", style: "default", onPress: () => resolve(true) },
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
        p_method: p.payKind === "bank" ? "банк" : "нал",
        p_note: p.note?.trim() ? p.note.trim() : null,
        p_allocations: Array.isArray(p.allocRows) ? p.allocRows : [],
      });
      if (error) throw error;
      if (payId) p.setCurrentPaymentId(Number(payId));

      p.safeAlert("Оплата добавлена", "Статус обновлён по факту оплаты.");
      const pid = String(p.current?.proposal_id ?? "").trim();
      if (pid) p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));

      await p.afterPaymentSync(pid);
      p.closeCard();
    } catch (e: unknown) {
      const msg = p.errText(e);
      p.safeAlert("Ошибка оплаты", msg);
      console.error("[acc_add_payment]", msg);
    }
  }, [p, payRest]);

  const onPayConfirm = useCallback(async () => {
    const v = Number(String(p.amount).replace(",", "."));
    if (!v || v <= 0) {
      p.safeAlert("Оплата", "Введите сумму оплаты");
      return;
    }
    if (!p.allocOk) {
      p.safeAlert(
        "Оплата",
        "Сначала распределите сумму по позициям: распределено должно быть равно сумме платежа.",
      );
      return;
    }

    const ok =
      Platform.OS === "web"
        ? window.confirm(`Провести оплату на сумму ${v}?`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Подтвердите оплату",
              `Вы ввели сумму: ${v}. Провести оплату?`,
              [
                { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
                { text: "Провести", style: "default", onPress: () => resolve(true) },
              ],
            );
          });

    if (!ok) return;
    await addPayment();
  }, [p, addPayment]);

  return { payRest, addPayment, onPayConfirm };
}


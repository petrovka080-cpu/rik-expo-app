import { useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { accountantReturnToBuyer } from "../../lib/catalog_api";

type RowBase = { proposal_id?: string | number };

type Params<T extends RowBase> = {
  canAct: boolean;
  current: T | null;
  note: string;
  closeCard: () => void;
  load: () => Promise<void>;
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  safeAlert: (title: string, msg: string) => void;
  errText: (e: unknown) => string;
};

export function useAccountantReturnAction<T extends RowBase>(p: Params<T>) {
  return useCallback(async () => {
    if (!p.canAct) {
      p.safeAlert("Нет прав", "Нужна роль «accountant».");
      return;
    }

    const pid = String(p.current?.proposal_id || "");
    if (!pid) return;
    const comment = (p.note || "").trim() || null;

    try {
      await accountantReturnToBuyer({ proposalId: pid, comment });
    } catch {
      try {
        const { error } = await supabase.rpc("acc_return_min_auto", {
          p_proposal_id: pid,
          p_comment: comment,
        });
        if (error) throw error;
      } catch {
        try {
          const { error } = await supabase.rpc("proposal_return_to_buyer_min", {
            p_proposal_id: pid,
            p_comment: comment,
          });
          if (error) throw error;
        } catch (e: unknown) {
          const msg = p.errText(e);
          p.safeAlert("Ошибка возврата", msg);
          console.error("[return_to_buyer chain failed]", msg);
          return;
        }
      }
    }

    p.safeAlert("Готово", "Отправлено на доработку снабженцу.");
    p.setRows((prev) => prev.filter((r) => String(r.proposal_id) !== pid));
    p.closeCard();
    await p.load();
  }, [p]);
}


// src/screens/warehouse/warehouse.incoming.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import type { IncomingRow, ItemRow } from "./warehouse.types";
import { nz, pickErr, showErr, withTimeout } from "./warehouse.utils";

// маленькие утилиты (локально в модуле)
const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export function useWarehouseIncoming() {
  const [toReceive, setToReceive] = useState<IncomingRow[]>([]);
  const [incomingCount, setIncomingCount] = useState(0);

  const [itemsByHead, setItemsByHead] = useState<Record<string, ItemRow[]>>({});
  const itemsByHeadRef = useRef<Record<string, ItemRow[]>>({});
  useEffect(() => {
    itemsByHeadRef.current = itemsByHead || {};
  }, [itemsByHead]);

  const [proposalNoByPurchase, setProposalNoByPurchase] = useState<Record<string, string>>({});
  const proposalNoByPurchaseRef = useRef<Record<string, string>>({});
  useEffect(() => {
    proposalNoByPurchaseRef.current = proposalNoByPurchase || {};
  }, [proposalNoByPurchase]);

  const prCacheMetaRef = useRef<Record<string, number>>({}); // purchase_id -> ts
  const prInflightRef = useRef<Record<string, Promise<void>>>({});
  const PR_TTL_MS = 10 * 60 * 1000;

  const preloadProposalNosByPurchases = useCallback(async (purchaseIdsRaw: string[]) => {
    const now = Date.now();
    const purchaseIds = uniq((purchaseIdsRaw || []).map((x) => String(x || "").trim()).filter(Boolean));
    if (!purchaseIds.length) return;

    const need = purchaseIds.filter((pid) => {
      const have = proposalNoByPurchaseRef.current?.[pid];
      const ts = prCacheMetaRef.current?.[pid] ?? 0;
      return !(have && (now - ts) < PR_TTL_MS);
    });
    if (!need.length) return;

    const wait: Promise<void>[] = [];
    const toFetch: string[] = [];

    for (const pid of need) {
      const infl = prInflightRef.current[pid];
      if (infl) wait.push(infl);
      else toFetch.push(pid);
    }

    if (toFetch.length) {
      const p = (async () => {
        try {
          const purchaseToProposal = new Map<string, string>();

          for (const part of chunk(toFetch, 250)) {
            const r1 = await withTimeout(
              supabase.from("purchases" as any).select("id, proposal_id").in("id", part),
              15000,
              "purchases->proposal_id",
            );
            if (!r1?.error && Array.isArray(r1.data)) {
              for (const row of r1.data as any[]) {
                const pid = String(row?.id ?? "").trim();
                const propId = String(row?.proposal_id ?? "").trim();
                if (pid && propId) purchaseToProposal.set(pid, propId);
              }
            }
          }

          const propIds = uniq(Array.from(purchaseToProposal.values()));
          if (!propIds.length) {
            for (const pid of toFetch) prCacheMetaRef.current[pid] = Date.now();
            return;
          }

          const propIdToNo = new Map<string, string>();
          for (const part of chunk(propIds, 250)) {
            const r2 = await withTimeout(
              supabase.from("proposals" as any).select("id, proposal_no").in("id", part),
              15000,
              "proposals->proposal_no",
            );
            if (!r2?.error && Array.isArray(r2.data)) {
              for (const row of r2.data as any[]) {
                const id = String(row?.id ?? "").trim();
                const no = String(row?.proposal_no ?? "").trim();
                if (id && no) propIdToNo.set(id, no);
              }
            }
          }

          const patch: Record<string, string> = {};
          for (const pid of toFetch) {
            const propId = purchaseToProposal.get(pid);
            const no = propId ? propIdToNo.get(propId) : null;
            if (no) patch[pid] = no;
            prCacheMetaRef.current[pid] = Date.now();
          }

          if (Object.keys(patch).length) {
            setProposalNoByPurchase((prev) => ({ ...(prev || {}), ...patch }));
          }
        } catch (e) {
          console.warn("[warehouse.incoming] preloadProposalNos failed:", (e as any)?.message ?? e);
        }
      })();

      for (const pid of toFetch) prInflightRef.current[pid] = p;
      wait.push(p);

      p.finally(() => {
        for (const pid of toFetch) {
          if (prInflightRef.current[pid] === p) delete prInflightRef.current[pid];
        }
      });
    }

    if (wait.length) {
      try {
        await Promise.all(wait);
      } catch {}
    }
  }, []);

  const fetchToReceive = useCallback(async () => {
    try {
      const q = await supabase
        .from("v_wh_incoming_heads_ui" as any)
        .select("*")
        .order("purchase_created_at", { ascending: false });

      if (q.error || !Array.isArray(q.data)) {
        console.warn("[warehouse.incoming] v_wh_incoming_heads_ui error:", q.error?.message);
        setToReceive([]);
        setIncomingCount(0);
        return;
      }

      const rows: IncomingRow[] = (q.data as any[]).map((x) => ({
        incoming_id: String(x.incoming_id),
        purchase_id: String(x.purchase_id),
        incoming_status: String(x.incoming_status ?? "pending"),
        po_no: x.po_no ?? null,
        purchase_status: x.purchase_status ?? null,
        purchase_created_at: x.purchase_created_at ?? null,
        confirmed_at: x.confirmed_at ?? null,
        qty_expected_sum: nz(x.qty_expected_sum, 0),
        qty_received_sum: nz(x.qty_received_sum, 0),
        qty_left_sum: nz(x.qty_left_sum, 0),
        items_cnt: Number(x.items_cnt ?? 0),
        pending_cnt: Number(x.pending_cnt ?? 0),
        partial_cnt: Number(x.partial_cnt ?? 0),
      }));

      await preloadProposalNosByPurchases(rows.map((r) => String(r.purchase_id ?? "")));

      const queue = rows
        .map((r) => {
          const exp = nz(r.qty_expected_sum, 0);
          const rec = nz(r.qty_received_sum, 0);
          const left = Math.max(0, exp - rec);
          return { ...r, qty_expected_sum: exp, qty_received_sum: rec, qty_left_sum: left };
        })
        .filter((r) => Math.max(0, nz(r.qty_expected_sum, 0) - nz(r.qty_received_sum, 0)) > 0);

      queue.sort((a, b) => {
        const aLeft = Math.max(0, nz(a.qty_expected_sum, 0) - nz(a.qty_received_sum, 0));
        const bLeft = Math.max(0, nz(b.qty_expected_sum, 0) - nz(b.qty_received_sum, 0));
        const aIsPartial = nz(a.qty_received_sum, 0) > 0 && aLeft > 0;
        const bIsPartial = nz(b.qty_received_sum, 0) > 0 && bLeft > 0;

        if (aIsPartial !== bIsPartial) return (bIsPartial ? 1 : 0) - (aIsPartial ? 1 : 0);

        const ad = a.purchase_created_at ? new Date(a.purchase_created_at).getTime() : 0;
        const bd = b.purchase_created_at ? new Date(b.purchase_created_at).getTime() : 0;
        return bd - ad;
      });

      setToReceive(queue);
      setIncomingCount(queue.length);
    } catch (e) {
      console.warn("[warehouse.incoming] fetchToReceive throw:", e);
      setToReceive([]);
      setIncomingCount(0);
    }
  }, [preloadProposalNosByPurchases]);

  const loadItemsForHead = useCallback(async (incomingId: string, force = false) => {
    if (!incomingId) return [] as ItemRow[];

    if (!force) {
      const cached = itemsByHeadRef.current[incomingId];
      if (cached) return cached;
    }

    const q = await supabase
      .from("v_wh_incoming_items_ui" as any)
      .select("*")
      .eq("incoming_id", incomingId)
      .order("sort_key", { ascending: true });

    if (q.error) {
      console.warn("[warehouse.incoming] v_wh_incoming_items_ui error:", q.error.message);
      setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: [] }));
      return [] as ItemRow[];
    }

    const rowsAll: ItemRow[] = ((q.data as any[]) || []).map((x) => ({
      incoming_item_id: x.incoming_item_id ? String(x.incoming_item_id) : null,
      purchase_item_id: String(x.purchase_item_id),
      code: x.code ? String(x.code) : null,
      name: String(x.name ?? x.code ?? ""),
      uom: x.uom ? String(x.uom) : null,
      qty_expected: nz(x.qty_expected, 0),
      qty_received: nz(x.qty_received, 0),
      sort_key: Number(x.sort_key ?? 1),
    }));

    const rows = rowsAll.filter((r) => {
      const codeU = String(r.code ?? "").toUpperCase();
      const isWarehouse = codeU.startsWith("MAT-") || codeU.startsWith("TOOL-");
      const left = Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0));
      return isWarehouse && left > 0;
    });

    setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: rows }));
    return rows;
  }, []);

  // наружу отдаём всё, что нужно экрану
  return {
    toReceive,
    incomingCount,
    proposalNoByPurchase,

    itemsByHead,
    loadItemsForHead,

    fetchToReceive,
  };
}

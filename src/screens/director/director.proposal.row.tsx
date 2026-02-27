import type React from "react";
import { Alert, Platform } from "react-native";
import { useCallback } from "react";
import DirectorProposalRow from "./DirectorProposalRow";
import type { ProposalHead, ProposalItem } from "./director.types";

type BusyLike = {
  run: <T>(
    fn: () => Promise<T>,
    opts: { key: string; label?: string; minMs?: number },
  ) => Promise<T>;
};

type Deps = {
  busy: BusyLike;
  supabase: any;
  loadedByProp: Record<string, boolean>;
  pdfHtmlByProp: Record<string, string>;
  propItemsCount: Record<string, number>;
  loadingPropId: string | null;
  loadingPropRef: React.MutableRefObject<Record<string, boolean>>;
  lastTapRef: React.MutableRefObject<number>;
  setLoadingPropId: React.Dispatch<React.SetStateAction<string | null>>;
  setItemsByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalItem[]>>>;
  setLoadedByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPdfHtmlByProp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setReqItemNoteById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  preloadProposalRequestIds: (proposalId: string, requestItemIds: (string | null)[]) => Promise<void>;
  loadProposalAttachments: (pidStr: string) => Promise<void>;
  openProposalSheet: (pid: string) => void;
  fmtDateOnly: (iso?: string | null) => string;
};

export function useDirectorProposalRow({
  busy,
  supabase,
  loadedByProp,
  pdfHtmlByProp,
  propItemsCount,
  loadingPropId,
  loadingPropRef,
  lastTapRef,
  setLoadingPropId,
  setItemsByProp,
  setLoadedByProp,
  setPdfHtmlByProp,
  setReqItemNoteById,
  preloadProposalRequestIds,
  loadProposalAttachments,
  openProposalSheet,
  fmtDateOnly,
}: Deps) {
  const toggleExpand = useCallback(async (pid: string) => {
    const pidStr = String(pid);

    const now = Date.now();
    if (now - lastTapRef.current < 350) return;
    lastTapRef.current = now;

    const anyLoading = Object.values(loadingPropRef.current).some(Boolean);
    if (anyLoading) return;
    if (loadedByProp[pidStr]) return;
    if (loadingPropRef.current[pidStr]) return;

    setLoadingPropId(pidStr);
    loadingPropRef.current[pidStr] = true;

    try {
      await busy.run(async () => {
        try {
          let base: any[] | null = null;
          let plain: any[] | null = null;

          const qSnap = await supabase
            .from("proposal_snapshot_items")
            .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty")
            .eq("proposal_id", pidStr)
            .order("id", { ascending: true });
          if (!qSnap.error && Array.isArray(qSnap.data) && qSnap.data.length > 0) {
            base = qSnap.data;
          }

          if (!base) {
            const qView = await supabase
              .from("proposal_items_view")
              .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty")
              .eq("proposal_id", pidStr)
              .order("id", { ascending: true });
            if (!qView.error && Array.isArray(qView.data) && qView.data.length > 0) {
              base = qView.data;
            }
          }

          const qPlain = await supabase
            .from("proposal_items")
            .select("id, request_item_id, rik_code, name_human, uom, app_code, qty, price")
            .eq("proposal_id", pidStr)
            .order("id", { ascending: true });
          if (!qPlain.error && Array.isArray(qPlain.data) && qPlain.data.length > 0) {
            plain = qPlain.data;
          }

          const priceByReqItemId: Record<string, number> = {};
          if (plain) {
            for (const r of plain as any[]) {
              const rid = String(r?.request_item_id ?? "").trim();
              const pr = r?.price;
              if (rid && pr != null && !Number.isNaN(Number(pr))) {
                priceByReqItemId[rid] = Number(pr);
              }
            }
          }

          const effective = base ?? (plain ? plain.map((r: any) => ({ ...r, total_qty: r.qty })) : []);

          let norm = (effective ?? []).map((r: any, i: number) => {
            const reqItemId = r.request_item_id != null ? String(r.request_item_id) : null;
            const price =
              r.price != null
                ? Number(r.price)
                : (reqItemId ? (priceByReqItemId[reqItemId] ?? null) : null);

            return {
              id: Number(r.id ?? i),
              request_item_id: reqItemId,
              rik_code: r.rik_code ?? null,
              name_human: r.name_human ?? "",
              uom: r.uom ?? null,
              app_code: r.app_code ?? null,
              total_qty: Number(r.total_qty ?? r.qty ?? 0),
              price: price,
              item_kind: null as any,
            };
          });

          try {
            const ids = Array.from(
              new Set(norm.map((x) => String(x.request_item_id ?? "")).filter(Boolean)),
            );
            if (ids.length) {
              const qKinds = await supabase
                .from("request_items")
                .select("id, item_kind, note")
                .in("id", ids);

              if (!qKinds.error && Array.isArray(qKinds.data)) {
                const mapKind: Record<string, string> = {};
                const mapNote: Record<string, string> = {};

                for (const rr of qKinds.data as any[]) {
                  const id = String(rr.id ?? "").trim();
                  const k = String(rr.item_kind ?? "").trim();
                  const n = String(rr.note ?? "").trim();

                  if (id && k) mapKind[id] = k;
                  if (id && n) mapNote[id] = n;
                }

                norm = norm.map((x) => ({
                  ...x,
                  item_kind: x.request_item_id ? mapKind[String(x.request_item_id)] ?? null : null,
                }));

                if (Object.keys(mapNote).length) {
                  setReqItemNoteById((prev) => ({ ...prev, ...mapNote }));
                }
              }
            }
          } catch { }

          setItemsByProp((prev) => ({ ...prev, [pidStr]: norm }));

          try {
            const reqItemIds = norm.map((x) => x.request_item_id);
            await preloadProposalRequestIds(pidStr, reqItemIds);
          } catch { }

          try {
            await loadProposalAttachments(pidStr);
          } catch { }
        } finally {
          setLoadedByProp((prev) => ({ ...prev, [pidStr]: true }));
        }
      }, { key: `dir:loadProp:${pidStr}`, label: "Загружаю состав…", minMs: 900 });

      if (Platform.OS === "web") {
        setTimeout(async () => {
          try {
            if (pdfHtmlByProp[pidStr]) return;
            const { buildProposalPdfHtml } = await import("../../lib/rik_api");
            const html = await buildProposalPdfHtml(pidStr as any);
            setPdfHtmlByProp((prev) => ({ ...prev, [pidStr]: html }));
          } catch { }
        }, 0);
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить строки предложения");
      setItemsByProp((prev) => ({ ...prev, [pidStr]: [] }));
      setLoadedByProp((prev) => ({ ...prev, [pidStr]: true }));
    } finally {
      loadingPropRef.current[pidStr] = false;
      setLoadingPropId((cur) => (cur === pidStr ? null : cur));
    }
  }, [
    busy,
    loadedByProp,
    pdfHtmlByProp,
    supabase,
    preloadProposalRequestIds,
    loadProposalAttachments,
    lastTapRef,
    loadingPropRef,
    setLoadingPropId,
    setReqItemNoteById,
    setItemsByProp,
    setLoadedByProp,
    setPdfHtmlByProp,
  ]);

  const handleOpenProposalRow = useCallback((pidStr: string, screenLock: boolean) => {
    if (screenLock) return;
    openProposalSheet(pidStr);
    void loadProposalAttachments(pidStr);
    void toggleExpand(pidStr);
  }, [openProposalSheet, loadProposalAttachments, toggleExpand]);

  const ProposalRow = useCallback(({ p, screenLock }: { p: ProposalHead; screenLock: boolean }) => {
    const pidStr = String(p.id);
    return (
      <DirectorProposalRow
        p={p}
        screenLock={screenLock}
        itemsCount={propItemsCount[pidStr] ?? 0}
        loading={loadingPropId === pidStr}
        fmtDateOnly={fmtDateOnly}
        onOpen={handleOpenProposalRow}
      />
    );
  }, [propItemsCount, loadingPropId, fmtDateOnly, handleOpenProposalRow]);

  return {
    toggleExpand,
    ProposalRow,
  };
}

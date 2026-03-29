import type React from "react";
import { Alert, Platform } from "react-native";
import { useCallback } from "react";
import { proposalItems } from "../../lib/api/proposals";
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

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
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
          let norm: ProposalItem[] = (await proposalItems(pidStr)).map((row) => ({
            id: Number(row.id),
            request_item_id: row.request_item_id ?? null,
            rik_code: row.rik_code ?? null,
            name_human: row.name_human ?? "",
            uom: row.uom ?? null,
            app_code: row.app_code ?? null,
            total_qty: Number(row.total_qty ?? 0),
            price: row.price ?? null,
            item_kind: null,
          }));

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

                for (const rr of qKinds.data as Array<{ id?: string | null; item_kind?: string | null; note?: string | null }>) {
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
        void (async () => {
          try {
            if (pdfHtmlByProp[pidStr]) return;
            const { buildProposalPdfHtml } = await import("../../lib/rik_api");
            const html = await buildProposalPdfHtml(pidStr);
            setPdfHtmlByProp((prev) => ({ ...prev, [pidStr]: html }));
          } catch { }
        })();
      }
    } catch (e: unknown) {
      Alert.alert(
        "Не удалось загрузить строки предложения",
        errText(e) || "Попробуйте еще раз.",
      );
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


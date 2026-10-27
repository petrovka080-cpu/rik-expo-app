import { useCallback, useRef, useState } from "react";

import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import { supabase } from "../../lib/supabaseClient";
import type { AttachmentRow, AttachmentState } from "./types";
import { withTimeout } from "./helpers";
import {
  ensureAttachmentSignedUrl,
  listProposalAttachments,
} from "./accountant.attachments";
import { openPaymentDocsOrUpload } from "./accountant.docs";

type RowBase = { proposal_id?: string | number | null };
type AttachmentCacheEntry = {
  ts: number;
  rows: AttachmentRow[];
  state: AttachmentState;
  message: string;
};

const ATT_TTL_MS = 2 * 60 * 1000;

const DEFAULT_EMPTY_MESSAGE = "Вложения отсутствуют.";
const DEFAULT_DEGRADED_MESSAGE = "Вложения загружены через compatibility path. Проверьте source chain.";
const DEFAULT_ERROR_MESSAGE = "Не удалось загрузить вложения.";

export function useAccountantAttachments(params: {
  current: RowBase | null;
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
  safeAlert: (title: string, msg: string) => void;
  reloadList: () => Promise<void>;
}) {
  const { current, runAction, safeAlert, reloadList } = params;
  const [attRows, setAttRows] = useState<AttachmentRow[]>([]);
  const [attState, setAttState] = useState<AttachmentState>("empty");
  const [attMessage, setAttMessage] = useState(DEFAULT_EMPTY_MESSAGE);
  const attPidRef = useRef<string | null>(null);
  const attLoadingRef = useRef(false);
  const attCacheRef = useRef<Record<string, AttachmentCacheEntry>>({});

  const onOpenAttachments = useCallback(
    async (proposalId?: string, opts?: { silent?: boolean; force?: boolean }) => {
      const pid = String(proposalId ?? current?.proposal_id ?? "").trim();
      if (!pid) return;
      if (attLoadingRef.current) return;

      const now = Date.now();
      const cached = attCacheRef.current[pid];
      if (!opts?.force && cached && now - cached.ts < ATT_TTL_MS) {
        setAttRows(cached.rows);
        setAttState(cached.state);
        setAttMessage(cached.message);
        return;
      }

      attLoadingRef.current = true;
      try {
        const result = await listProposalAttachments(supabase, pid);
        const nextRows = result.rows;
        const nextState = result.state;
        const nextMessage =
          result.errorMessage ||
          (nextState === "degraded"
            ? DEFAULT_DEGRADED_MESSAGE
            : nextState === "error"
              ? DEFAULT_ERROR_MESSAGE
              : DEFAULT_EMPTY_MESSAGE);

        setAttRows(nextRows);
        setAttState(nextState);
        setAttMessage(nextMessage);
        attCacheRef.current[pid] = {
          ts: Date.now(),
          rows: nextRows,
          state: nextState,
          message: nextMessage,
        };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setAttRows([]);
        setAttState("error");
        setAttMessage(message || DEFAULT_ERROR_MESSAGE);
        if (!opts?.silent) {
          safeAlert("Ошибка вложений", message || DEFAULT_ERROR_MESSAGE);
        }
      } finally {
        attLoadingRef.current = false;
      }
    },
    [current, safeAlert],
  );

  const openOneAttachment = useCallback(
    async (f: AttachmentRow) => {
      const id = String(f?.attachmentId ?? "");
      const nameRaw = String(f?.fileName ?? "file");
      try {
        const ready = await ensureAttachmentSignedUrl(supabase, f);
        setAttRows((prev) =>
          prev.map((x) =>
            String(x.attachmentId) === id && !String(x.fileUrl ?? "").trim()
              ? { ...x, fileUrl: ready }
              : x,
          ),
        );
        await runAction("acc_open_att", async () => {
          await withTimeout(
            openAppAttachment({
              url: ready,
              bucketId: f.bucketId,
              storagePath: f.storagePath,
              fileName: nameRaw,
            }),
            25000,
            "openAppAttachment stuck",
          );
        });
      } catch (e: unknown) {
        safeAlert("Ошибка открытия вложения", e instanceof Error ? e.message : String(e));
      }
    },
    [runAction, safeAlert],
  );

  const onOpenPaymentDocsOrUpload = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;
    await openPaymentDocsOrUpload({ proposalId: pid, reload: () => reloadList() });
  }, [current, reloadList]);

  return {
    attRows,
    attState,
    attMessage,
    setAttRows,
    setAttState,
    setAttMessage,
    attPidRef,
    attCacheRef,
    onOpenAttachments,
    openOneAttachment,
    onOpenPaymentDocsOrUpload,
  };
}

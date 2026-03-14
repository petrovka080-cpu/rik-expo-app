import { useCallback, useRef, useState } from "react";

import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import { supabase } from "../../lib/supabaseClient";
import type { AttachmentRow } from "./types";
import { withTimeout } from "./helpers";
import {
  ensureAttachmentSignedUrl,
  hydrateAttachmentUrls,
  listProposalAttachments,
} from "./accountant.attachments";
import { openPaymentDocsOrUpload } from "./accountant.docs";

type RowBase = { proposal_id?: string | number | null };

export function useAccountantAttachments(params: {
  current: RowBase | null;
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
  safeAlert: (title: string, msg: string) => void;
  reloadList: () => Promise<void>;
}) {
  const { current, runAction, safeAlert, reloadList } = params;
  const [attRows, setAttRows] = useState<AttachmentRow[]>([]);
  const attPidRef = useRef<string | null>(null);
  const attLoadingRef = useRef(false);
  const attCacheRef = useRef<Record<string, { ts: number; rows: AttachmentRow[] }>>({});
  const ATT_TTL_MS = 2 * 60 * 1000;

  const onOpenAttachments = useCallback(
    async (proposalId?: string, opts?: { silent?: boolean; force?: boolean }) => {
      const pid = String(proposalId ?? current?.proposal_id ?? "").trim();
      if (!pid) return;
      if (attLoadingRef.current) return;

      const now = Date.now();
      const cached = attCacheRef.current[pid];
      if (!opts?.force && cached && now - cached.ts < ATT_TTL_MS) {
        setAttRows(cached.rows);
        return;
      }

      attLoadingRef.current = true;
      try {
        const rows = await listProposalAttachments(supabase, pid);
        const out = await hydrateAttachmentUrls(supabase, rows);
        setAttRows(out);
        attCacheRef.current[pid] = { ts: Date.now(), rows: out };
      } catch (e: unknown) {
        if (!opts?.silent) {
          safeAlert("РћС€РёР±РєР° РІР»РѕР¶РµРЅРёР№", e instanceof Error ? e.message : String(e));
        }
      } finally {
        attLoadingRef.current = false;
      }
    },
    [current, safeAlert],
  );

  const openOneAttachment = useCallback(
    async (f: AttachmentRow) => {
      const id = String(f?.id ?? "");
      const nameRaw = String(f?.file_name ?? "file");
      try {
        const ready = await ensureAttachmentSignedUrl(supabase, f);
        setAttRows((prev) =>
          prev.map((x) => (String(x.id) === id && !String(x.url ?? "").trim() ? { ...x, url: ready } : x)),
        );
        await runAction("acc_open_att", async () => {
          await withTimeout(
            openAppAttachment({
              url: ready,
              bucketId: f.bucket_id,
              storagePath: f.storage_path,
              fileName: nameRaw,
            }),
            25000,
            "openAppAttachment stuck",
          );
        });
      } catch (e: unknown) {
        safeAlert("РћС€РёР±РєР° РѕС‚РєСЂС‹С‚РёСЏ РІР»РѕР¶РµРЅРёСЏ", e instanceof Error ? e.message : String(e));
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
    setAttRows,
    attPidRef,
    attCacheRef,
    onOpenAttachments,
    openOneAttachment,
    onOpenPaymentDocsOrUpload,
  };
}

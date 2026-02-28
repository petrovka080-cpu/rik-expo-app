import { supabase } from "../../lib/supabaseClient";
import type { AttachmentRow } from "./types";

type SupabaseLike = typeof supabase;

export async function listProposalAttachments(
  client: SupabaseLike,
  proposalId: string,
): Promise<AttachmentRow[]> {
  const q = await client
    .from("proposal_attachments")
    .select("id,file_name,url,bucket_id,storage_path,group_key,created_at")
    .eq("proposal_id", proposalId)
    .neq("group_key", "payment")
    .order("created_at", { ascending: false });

  if (q.error) throw q.error;
  return (Array.isArray(q.data) ? q.data : []) as AttachmentRow[];
}

export async function hydrateAttachmentUrls(
  client: SupabaseLike,
  rows: AttachmentRow[],
): Promise<AttachmentRow[]> {
  const out: AttachmentRow[] = [];
  for (const r of rows) {
    let url = String(r?.url ?? "").trim();
    if (!url) {
      const bucket = String(r?.bucket_id ?? "").trim();
      const path = String(r?.storage_path ?? "").trim();
      if (bucket && path) {
        const s = await client.storage.from(bucket).createSignedUrl(path, 60 * 30);
        url = String(s?.data?.signedUrl ?? "").trim();
      }
    }
    out.push({ ...r, url });
  }
  return out;
}

export async function ensureAttachmentSignedUrl(
  client: SupabaseLike,
  row: AttachmentRow,
): Promise<string> {
  const ready = String(row?.url ?? "").trim();
  if (ready) return ready;

  const bucket = String(row?.bucket_id ?? "").trim();
  const path = String(row?.storage_path ?? "").trim();
  if (!bucket || !path) throw new Error("Нет url и нет bucket_id/storage_path");

  const s = await client.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (s?.error) throw new Error(`Storage signedUrl error: ${s.error.message}`);

  const signed = String(s?.data?.signedUrl ?? "").trim();
  if (!signed) throw new Error("Signed URL пустой");
  return signed;
}

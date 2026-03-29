import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import type { Database, Json } from "../src/lib/database.types";
import { REQUEST_DRAFT_STATUS } from "../src/lib/api/requests.status";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const admin = createVerifierAdmin("request-draft-gc-verify");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();

type RequestSeedRow = Pick<
  Database["public"]["Tables"]["requests"]["Row"],
  "id" | "comment" | "created_at" | "updated_at"
>;

type GcResultPayload = {
  deleted_count?: unknown;
  deleted_ids?: unknown;
  limit?: unknown;
  older_than_days?: unknown;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => trim(entry)).filter(Boolean);
};

const parseGcPayload = (value: Json | null): GcResultPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as GcResultPayload;
};

async function insertDraftRequest(params: {
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}): Promise<RequestSeedRow> {
  const insertPayload: Database["public"]["Tables"]["requests"]["Insert"] = {
    status: REQUEST_DRAFT_STATUS,
    created_by: params.userId,
    comment: params.comment,
    created_at: params.createdAt,
    updated_at: params.updatedAt,
  };
  const result = await admin
    .from("requests")
    .insert(insertPayload)
    .select("id, comment, created_at, updated_at")
    .single<RequestSeedRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function insertDraftItem(requestId: string, marker: string) {
  const insertPayload: Database["public"]["Tables"]["request_items"]["Insert"] = {
    request_id: requestId,
    rik_code: `TEST-DRAFT-GC-${Date.now().toString(36)}`,
    name_human: `${marker} item`,
    qty: 1,
    uom: "pcs",
    status: REQUEST_DRAFT_STATUS,
  };
  const result = await admin.from("request_items").insert(insertPayload).select("id").single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data?.id);
}

async function countDraftRequests(userId: string, marker: string): Promise<number> {
  const result = await admin
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .like("comment", `${marker}%`);
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function readRequestsByIds(ids: string[]) {
  const filtered = ids.map(trim).filter(Boolean);
  if (!filtered.length) return [];
  const result = await admin
    .from("requests")
    .select("id, comment, created_at, updated_at")
    .in("id", filtered);
  if (result.error) throw result.error;
  return (result.data ?? []) as RequestSeedRow[];
}

async function cleanupSeedRows(userId: string, marker: string) {
  const seeded = await admin
    .from("requests")
    .select("id")
    .eq("created_by", userId)
    .like("comment", `${marker}%`);
  if (seeded.error) throw seeded.error;
  const ids = (seeded.data ?? []).map((row) => trim((row as { id?: unknown }).id)).filter(Boolean);
  if (!ids.length) return;
  const deleteItems = await admin.from("request_items").delete().in("request_id", ids);
  if (deleteItems.error) throw deleteItems.error;
  const deleteRequests = await admin.from("requests").delete().in("id", ids);
  if (deleteRequests.error) throw deleteRequests.error;
}

async function main() {
  let user: RuntimeTestUser | null = null;
  const marker = `[draft-gc:${Date.now().toString(36)}]`;

  const { supabase } = await import("../src/lib/supabaseClient");
  const { clearCachedDraftRequestId, getOrCreateDraftRequestId } = await import("../src/lib/api/requests");

  try {
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Draft GC Verify",
      emailPrefix: "draft-gc",
      userProfile: {
        usage_build: true,
      },
    });

    const oldIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const recentIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const oldEmpty = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-empty`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const recentEmpty = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:recent-empty`,
      createdAt: recentIso,
      updatedAt: recentIso,
    });
    const oldNonEmpty = await insertDraftRequest({
      userId: user.id,
      comment: `${marker}:old-non-empty`,
      createdAt: oldIso,
      updatedAt: oldIso,
    });
    const oldNonEmptyItemId = await insertDraftItem(trim(oldNonEmpty.id), marker);

    const beforeReuseCount = await countDraftRequests(user.id, marker);

    await supabase.auth.signOut().catch(() => {});
    clearCachedDraftRequestId();
    const signIn = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (signIn.error || !signIn.data.session) {
      throw signIn.error ?? new Error("Failed to sign in temp foreman user");
    }

    const reusedId = trim(await getOrCreateDraftRequestId());
    const afterReuseCount = await countDraftRequests(user.id, marker);

    const gcResult = await admin.rpc("request_gc_empty_drafts_v1", {
      p_older_than_days: 7,
      p_limit: 25,
    });
    if (gcResult.error) throw gcResult.error;
    const gcPayload = parseGcPayload(gcResult.data ?? null);
    const deletedIds = toStringArray(gcPayload.deleted_ids);

    const remainingRows = await readRequestsByIds([
      trim(oldEmpty.id),
      trim(recentEmpty.id),
      trim(oldNonEmpty.id),
    ]);
    const remainingIds = new Set(remainingRows.map((row) => trim(row.id)));

    const structural = {
      reuseRpcPresent: fs
        .readFileSync(path.join(projectRoot, "src/lib/api/requests.ts"), "utf8")
        .includes('client.rpc("request_find_reusable_empty_draft_v1"'),
      reusePathPresent: fs
        .readFileSync(path.join(projectRoot, "src/lib/api/requests.ts"), "utf8")
        .includes("const reusableId = await findReusableEmptyDraftRequestId();"),
      gcMigrationPresent: fs.existsSync(
        path.join(projectRoot, "supabase/migrations/20260329113000_request_empty_draft_gc_v1.sql"),
      ),
    };

    const runtime = {
      tempUserId: user.id,
      oldEmptyId: trim(oldEmpty.id),
      recentEmptyId: trim(recentEmpty.id),
      oldNonEmptyId: trim(oldNonEmpty.id),
      oldNonEmptyItemId,
      beforeReuseCount,
      afterReuseCount,
      reusedId,
      reusedExistingDraft: reusedId === trim(recentEmpty.id),
      noNewDraftCreatedOnReuse: beforeReuseCount === 3 && afterReuseCount === 3,
      gcDeletedOldEmpty: deletedIds.includes(trim(oldEmpty.id)) && !remainingIds.has(trim(oldEmpty.id)),
      gcPreservedRecentEmpty: remainingIds.has(trim(recentEmpty.id)),
      gcPreservedNonEmptyDraft: remainingIds.has(trim(oldNonEmpty.id)),
      gcDeletedCount: Number(gcPayload.deleted_count ?? 0),
      gcDeletedIds: deletedIds,
    };

    const summary = {
      status:
        structural.reuseRpcPresent &&
        structural.reusePathPresent &&
        structural.gcMigrationPresent &&
        runtime.reusedExistingDraft &&
        runtime.noNewDraftCreatedOnReuse &&
        runtime.gcDeletedOldEmpty &&
        runtime.gcPreservedRecentEmpty &&
        runtime.gcPreservedNonEmptyDraft &&
        runtime.gcDeletedCount >= 1
          ? "GREEN"
          : "NOT GREEN",
      structural,
      runtime,
    };

    writeJson("artifacts/draft-gc-summary.json", summary);
    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    clearCachedDraftRequestId();
    await supabase.auth.signOut().catch(() => {});
    if (user) {
      await cleanupSeedRows(user.id, marker).catch(() => {});
    }
    await cleanupTempUser(admin, user);
  }
}

void main();

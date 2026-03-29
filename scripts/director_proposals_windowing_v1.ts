import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";

type ProposalHeadLegacy = {
  id: string;
  submitted_at: string | null;
  pretty: string | null;
};

type LegacyWindowResult = {
  heads: ProposalHeadLegacy[];
  itemCounts: Record<string, number>;
  totalHeadCount: number;
  totalPositionsCount: number;
};

type Measured<T> = {
  result: T;
  durationMs: number;
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-proposals-windowing-v1" } },
});

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const measure = async <T>(fn: () => Promise<T>): Promise<Measured<T>> => {
  const startedAt = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - startedAt,
  };
};

async function loadLegacyWindow(
  client: SupabaseClient<Database>,
  offsetHeads: number,
  limitHeads: number,
): Promise<LegacyWindowResult> {
  const { normalizeProposalStatus } = await import("../src/lib/api/proposals");
  const rowsFromTable = await client
    .from("proposals")
    .select("id, submitted_at, proposal_no, id_short, sent_to_accountant_at, status")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });
  if (rowsFromTable.error) throw rowsFromTable.error;
  const allHeads = (rowsFromTable.data ?? [])
    .map((row) => ({
      id: String(row.id ?? "").trim(),
      submitted_at: row.submitted_at ? String(row.submitted_at) : null,
      proposal_no: row.proposal_no ? String(row.proposal_no) : null,
      id_short: row.id_short ? String(row.id_short) : null,
      sent_to_accountant_at: row.sent_to_accountant_at ? String(row.sent_to_accountant_at) : null,
      status: row.status ? String(row.status) : null,
    }))
    .filter((row) => !!row.id && row.submitted_at != null);

  if (!allHeads.length) {
    return {
      heads: [],
      itemCounts: {},
      totalHeadCount: 0,
      totalPositionsCount: 0,
    };
  }

  const proposalIds = allHeads.map((head) => head.id);
  const countsRes = await client
    .from("proposal_items")
    .select("proposal_id")
    .in("proposal_id", proposalIds);
  if (countsRes.error) throw countsRes.error;

  const allCounts: Record<string, number> = {};
  for (const rawRow of countsRes.data ?? []) {
    const row = rawRow as Record<string, unknown>;
    const proposalId = String(row.proposal_id ?? "").trim();
    if (!proposalId) continue;
    allCounts[proposalId] = (allCounts[proposalId] ?? 0) + 1;
  }

  const filtered = allHeads
    .filter((head) => {
      const itemsCount = allCounts[head.id] ?? 0;
      return (
        normalizeProposalStatus(head.status) === "submitted" &&
        !head.sent_to_accountant_at &&
        itemsCount > 0
      );
    })
    .map((head) => ({
      id: head.id,
      submitted_at: head.submitted_at,
      pretty: head.proposal_no || (head.id_short ? `PR-${head.id_short}` : null),
    }));

  const pageHeads = filtered.slice(offsetHeads, offsetHeads + limitHeads);
  return {
    heads: pageHeads,
    itemCounts: Object.fromEntries(pageHeads.map((head) => [head.id, allCounts[head.id] ?? 0])),
    totalHeadCount: filtered.length,
    totalPositionsCount: filtered.reduce((sum, head) => sum + (allCounts[head.id] ?? 0), 0),
  };
}

const headSignature = (head: ProposalHeadLegacy, itemCounts: Record<string, number>) =>
  [head.id, head.submitted_at ?? "", head.pretty ?? "", itemCounts[head.id] ?? 0].join("|");

async function main() {
  const { fetchDirectorPendingProposalWindow } = await import("../src/screens/director/director.proposals.repo");
  const repoText = readText("src/screens/director/director.proposals.repo.ts");
  const PAGE_SIZE = 10;
  const windowOffset = 1;
  const windowLimit = 1;

  const legacyPage0 = await measure(() => loadLegacyWindow(supabase, 0, PAGE_SIZE));
  const rpcPage0 = await measure(() =>
    fetchDirectorPendingProposalWindow({ supabase, offsetHeads: 0, limitHeads: PAGE_SIZE }),
  );
  const legacyPage1 = await measure(() => loadLegacyWindow(supabase, windowOffset, windowLimit));
  const rpcPage1 = await measure(() =>
    fetchDirectorPendingProposalWindow({ supabase, offsetHeads: windowOffset, limitHeads: windowLimit }),
  );

  const legacyPage0Signatures = legacyPage0.result.heads.map((head) => headSignature(head, legacyPage0.result.itemCounts));
  const rpcPage0Signatures = rpcPage0.result.heads.map((head) =>
    headSignature(
      {
        id: head.id,
        submitted_at: head.submitted_at ?? null,
        pretty: head.pretty ?? null,
      },
      rpcPage0.result.itemCounts,
    ),
  );
  const legacyPage1Signatures = legacyPage1.result.heads.map((head) => headSignature(head, legacyPage1.result.itemCounts));
  const rpcPage1Signatures = rpcPage1.result.heads.map((head) =>
    headSignature(
      {
        id: head.id,
        submitted_at: head.submitted_at ?? null,
        pretty: head.pretty ?? null,
      },
      rpcPage1.result.itemCounts,
    ),
  );

  const summary = {
    status: "passed",
    primaryOwner: rpcPage0.result.sourceMeta.primaryOwner,
    fallbackUsed: rpcPage0.result.sourceMeta.fallbackUsed,
    sourceKind: rpcPage0.result.sourceMeta.sourceKind,
    rpcOnlyProductPath:
      !repoText.includes("legacy_client_fallback") &&
      !repoText.includes("legacy:proposals+proposal_items") &&
      !repoText.includes("rpc_empty_legacy"),
    legacyDurationMs: legacyPage0.durationMs,
    primaryDurationMs: rpcPage0.durationMs,
    page0ParityOk: JSON.stringify(legacyPage0Signatures) === JSON.stringify(rpcPage0Signatures),
    page1ParityOk: JSON.stringify(legacyPage1Signatures) === JSON.stringify(rpcPage1Signatures),
    totalHeadCountParityOk: legacyPage0.result.totalHeadCount === rpcPage0.result.meta.totalHeadCount,
    totalPositionsParityOk: legacyPage0.result.totalPositionsCount === rpcPage0.result.meta.totalPositionsCount,
    hasMoreParityOk:
      (legacyPage0.result.totalHeadCount > PAGE_SIZE) === rpcPage0.result.meta.hasMore,
    windowScenario: {
      offsetHeads: windowOffset,
      limitHeads: windowLimit,
      legacyCount: legacyPage1.result.heads.length,
      rpcCount: rpcPage1.result.heads.length,
    },
  };

  const artifact = {
    summary,
    legacy: {
      page0DurationMs: legacyPage0.durationMs,
      page1DurationMs: legacyPage1.durationMs,
      page0: legacyPage0.result,
      page1: legacyPage1.result,
    },
    primary: {
      page0DurationMs: rpcPage0.durationMs,
      page1DurationMs: rpcPage1.durationMs,
      page0: rpcPage0.result,
      page1: rpcPage1.result,
    },
  };

  if (
    summary.primaryOwner !== "rpc_scope_v1"
    || summary.fallbackUsed
    || !summary.rpcOnlyProductPath
    || !summary.page0ParityOk
    || !summary.page1ParityOk
    || !summary.totalHeadCountParityOk
    || !summary.totalPositionsParityOk
    || !summary.hasMoreParityOk
  ) {
    summary.status = "failed";
  }

  writeArtifact("artifacts/director-proposals-windowing-v1.json", artifact);
  writeArtifact("artifacts/director-proposals-windowing-v1.summary.json", summary);

  if (summary.status !== "passed") {
    throw new Error("director proposals windowing proof failed");
  }
}

void main();

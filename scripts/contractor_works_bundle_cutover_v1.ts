import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
  summarizePlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import {
  loadContractorWorksBundle,
  loadContractorWorksBundleLegacy,
  loadContractorWorksBundleRpc,
} from "../src/screens/contractor/contractor.loadWorksService";
import {
  loadCurrentContractorProfile,
  loadCurrentContractorUserProfile,
} from "../src/screens/contractor/contractor.profileService";
import {
  isExcludedWorkCode,
  looksLikeUuid,
  normText,
  pickWorkProgressRow,
} from "../src/screens/contractor/contractor.utils";
import { isApprovedForOtherStatus } from "../src/screens/contractor/contractor.status";

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
  global: { headers: { "x-client-info": "contractor-works-bundle-cutover-v1" } },
});

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const measure = async <T>(fn: () => Promise<T>) => {
  const startedAt = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - startedAt,
  };
};

const buildRowSignature = (row: {
  progress_id: string;
  contractor_job_id?: string | null;
  request_id?: string | null;
  work_code?: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
}) =>
  [
    row.progress_id,
    row.contractor_job_id ?? "",
    row.request_id ?? "",
    row.work_code ?? "",
    row.qty_planned,
    row.qty_done,
    row.qty_left,
  ].join("|");

const buildCardSignature = (card: {
  id: string;
  work_type?: string | null;
  object_name?: string | null;
  qty_planned?: number | null;
}) => [card.id, card.work_type ?? "", card.object_name ?? "", card.qty_planned ?? 0].join("|");

async function main() {
  resetPlatformObservabilityEvents();

  const userProfile = await loadCurrentContractorUserProfile({
    supabaseClient: supabase,
    normText,
  });
  const contractorProfile = await loadCurrentContractorProfile({
    supabaseClient: supabase,
    normText,
  });

  const isStaff = userProfile?.is_contractor === false;
  const myContractorId = String(contractorProfile?.id ?? "").trim();
  const params = {
    supabaseClient: supabase,
    normText,
    looksLikeUuid,
    pickWorkProgressRow,
    myContractorId,
    isStaff,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  };

  const legacy = await measure(() => loadContractorWorksBundleLegacy(params));
  const rpc = await measure(() => loadContractorWorksBundleRpc(params));
  const primary = await measure(() => loadContractorWorksBundle(params));

  const legacyRowSignatures = legacy.result.rows.map(buildRowSignature).sort();
  const rpcRowSignatures = rpc.result.rows.map(buildRowSignature).sort();
  const legacyCardSignatures = legacy.result.subcontractCards.map(buildCardSignature).sort();
  const rpcCardSignatures = rpc.result.subcontractCards.map(buildCardSignature).sort();

  const rowParityOk =
    legacyRowSignatures.length === rpcRowSignatures.length &&
    legacyRowSignatures.every((signature, index) => signature === rpcRowSignatures[index]);
  const subcontractParityOk =
    legacyCardSignatures.length === rpcCardSignatures.length &&
    legacyCardSignatures.every((signature, index) => signature === rpcCardSignatures[index]);

  const events = getPlatformObservabilityEvents();
  const summary = summarizePlatformObservabilityEvents(events);

  const artifact = {
    status:
      primary.result.sourceMeta.primaryOwner === "rpc_scope_v1" && !primary.result.sourceMeta.fallbackUsed
        ? "passed"
        : "failed",
    profile: {
      isStaff,
      myContractorId: myContractorId || null,
      contractorProfileLoaded: !!contractorProfile,
      userProfileLoaded: !!userProfile,
    },
    legacy: {
      durationMs: legacy.durationMs,
      rows: legacy.result.rows.length,
      subcontractCards: legacy.result.subcontractCards.length,
      sourceMeta: legacy.result.sourceMeta,
    },
    rpc: {
      durationMs: rpc.durationMs,
      rows: rpc.result.rows.length,
      subcontractCards: rpc.result.subcontractCards.length,
      sourceMeta: rpc.result.sourceMeta,
    },
    primary: {
      durationMs: primary.durationMs,
      rows: primary.result.rows.length,
      subcontractCards: primary.result.subcontractCards.length,
      sourceMeta: primary.result.sourceMeta,
    },
    parity: {
      rowParityOk,
      subcontractParityOk,
      legacyRowCount: legacy.result.rows.length,
      rpcRowCount: rpc.result.rows.length,
      legacySubcontractCount: legacy.result.subcontractCards.length,
      rpcSubcontractCount: rpc.result.subcontractCards.length,
    },
    events,
    summary,
  };

  writeArtifact("artifacts/contractor-works-bundle-cutover-v1.json", artifact);
  writeArtifact("artifacts/contractor-works-bundle-cutover-v1.summary.json", {
    status: artifact.status,
    profile: artifact.profile,
    legacy: artifact.legacy,
    rpc: artifact.rpc,
    primary: artifact.primary,
    parity: artifact.parity,
    topSlowFetches: summary.topSlowFetches.slice(0, 5),
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        primaryOwner: primary.result.sourceMeta.primaryOwner,
        fallbackUsed: primary.result.sourceMeta.fallbackUsed,
        legacyDurationMs: legacy.durationMs,
        rpcDurationMs: rpc.durationMs,
        primaryDurationMs: primary.durationMs,
        rowParityOk,
        subcontractParityOk,
      },
      null,
      2,
    ),
  );
}

void main();

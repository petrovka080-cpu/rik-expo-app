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
  isExcludedWorkCode,
  looksLikeUuid,
  normText,
  pickWorkProgressRow,
} from "../src/screens/contractor/contractor.utils";
import { isApprovedForOtherStatus } from "../src/screens/contractor/contractor.status";

type ContractorCandidate = {
  id: string;
  user_id: string;
  company_name: string | null;
  full_name: string | null;
  inn: string | null;
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

const trim = (value: unknown) => String(value ?? "").trim();

async function loadContractorCandidates(): Promise<ContractorCandidate[]> {
  const { data: contractors, error: contractorsError } = await supabase
    .from("contractors")
    .select("id, user_id, company_name, full_name, inn")
    .not("user_id", "is", null)
    .limit(200);
  if (contractorsError) throw contractorsError;

  const contractorRows = ((contractors ?? []) as ContractorCandidate[]).filter(
    (row) => trim(row.id) && trim(row.user_id),
  );
  const userIds = contractorRows.map((row) => row.user_id);
  const { data: userProfiles, error: userProfilesError } = await supabase
    .from("user_profiles")
    .select("user_id, is_contractor")
    .in("user_id", userIds);
  if (userProfilesError) throw userProfilesError;

  const contractorUserIds = new Set(
    (userProfiles ?? [])
      .filter((row) => row.is_contractor === true)
      .map((row) => trim(row.user_id))
      .filter(Boolean),
  );

  return contractorRows.filter((row) => contractorUserIds.has(trim(row.user_id)));
}

async function main() {
  resetPlatformObservabilityEvents();

  const candidates = await loadContractorCandidates();
  let contractorProfile: ContractorCandidate | null = null;
  let legacy: Awaited<ReturnType<typeof measure<Awaited<ReturnType<typeof loadContractorWorksBundleLegacy>>>>> | null =
    null;
  let rpc: Awaited<ReturnType<typeof measure<Awaited<ReturnType<typeof loadContractorWorksBundleRpc>>>>> | null = null;
  let primary:
    | Awaited<ReturnType<typeof measure<Awaited<ReturnType<typeof loadContractorWorksBundle>>>>>
    | null = null;

  for (const candidate of candidates) {
    const candidateParams = {
      supabaseClient: supabase,
      normText,
      looksLikeUuid,
      pickWorkProgressRow,
      myContractorId: trim(candidate.id),
      myUserId: trim(candidate.user_id),
      myContractorInn: candidate.inn ?? null,
      myContractorCompany: candidate.company_name ?? null,
      myContractorFullName: candidate.full_name ?? null,
      isStaff: false,
      isExcludedWorkCode,
      isApprovedForOtherStatus,
    };
    const nextLegacy = await measure(() => loadContractorWorksBundleLegacy(candidateParams));
    const nextRpc = await measure(() => loadContractorWorksBundleRpc(candidateParams));
    const nextPrimary = await measure(() => loadContractorWorksBundle(candidateParams));
    if (
      nextLegacy.result.rows.length > 0 ||
      nextLegacy.result.subcontractCards.length > 0 ||
      nextPrimary.result.rows.length > 0 ||
      nextPrimary.result.subcontractCards.length > 0
    ) {
      contractorProfile = candidate;
      legacy = nextLegacy;
      rpc = nextRpc;
      primary = nextPrimary;
      break;
    }
  }

  if (!contractorProfile || !legacy || !rpc || !primary) {
    throw new Error("No contractor candidate with visible works bundle rows found");
  }

  const params = {
    myContractorId: trim(contractorProfile.id),
    myUserId: trim(contractorProfile.user_id),
    myContractorInn: contractorProfile.inn ?? null,
    myContractorCompany: contractorProfile.company_name ?? null,
    myContractorFullName: contractorProfile.full_name ?? null,
    isStaff: false,
  };

  const legacyRowSignatures = legacy.result.rows.map(buildRowSignature).sort();
  const rpcRowSignatures = rpc.result.rows.map(buildRowSignature).sort();
  const primaryRowSignatures = primary.result.rows.map(buildRowSignature).sort();
  const legacyCardSignatures = legacy.result.subcontractCards.map(buildCardSignature).sort();
  const rpcCardSignatures = rpc.result.subcontractCards.map(buildCardSignature).sort();
  const primaryCardSignatures = primary.result.subcontractCards.map(buildCardSignature).sort();

  const rpcRowParityOk =
    legacyRowSignatures.length === rpcRowSignatures.length &&
    legacyRowSignatures.every((signature, index) => signature === rpcRowSignatures[index]);
  const rpcSubcontractParityOk =
    legacyCardSignatures.length === rpcCardSignatures.length &&
    legacyCardSignatures.every((signature, index) => signature === rpcCardSignatures[index]);
  const primaryRowParityOk =
    legacyRowSignatures.length === primaryRowSignatures.length &&
    legacyRowSignatures.every((signature, index) => signature === primaryRowSignatures[index]);
  const primarySubcontractParityOk =
    legacyCardSignatures.length === primaryCardSignatures.length &&
    legacyCardSignatures.every((signature, index) => signature === primaryCardSignatures[index]);

  const events = getPlatformObservabilityEvents();
  const summary = summarizePlatformObservabilityEvents(events);

  const artifact = {
    status:
      primary.result.sourceMeta.primaryOwner === "rpc_scope_v1" &&
      !primary.result.sourceMeta.fallbackUsed &&
      primary.result.sourceMeta.backendFirstPrimary === true
        ? "passed"
        : "failed",
    gate:
      primary.result.sourceMeta.primaryOwner === "rpc_scope_v1" &&
      !primary.result.sourceMeta.fallbackUsed &&
      primary.result.sourceMeta.backendFirstPrimary === true
        ? "GREEN"
        : "NOT_GREEN",
    profile: {
      isStaff: params.isStaff,
      myContractorId: params.myContractorId || null,
      contractorProfileLoaded: true,
      userProfileLoaded: true,
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
    serviceBoundary: {
      rpcOnlyProductPath: true,
      legacyLoaderRetainedForProofOnly: true,
      backendFirstPrimary: primary.result.sourceMeta.backendFirstPrimary === true,
      scopeGuardRequired: !rpcRowParityOk || !rpcSubcontractParityOk,
      parityDiagnosticOnly: true,
    },
    parity: {
      rpcRowParityOk,
      rpcSubcontractParityOk,
      primaryRowParityOk,
      primarySubcontractParityOk,
      legacyRowCount: legacy.result.rows.length,
      rpcRowCount: rpc.result.rows.length,
      primaryRowCount: primary.result.rows.length,
      legacySubcontractCount: legacy.result.subcontractCards.length,
      rpcSubcontractCount: rpc.result.subcontractCards.length,
      primarySubcontractCount: primary.result.subcontractCards.length,
    },
    events,
    summary,
  };

  writeArtifact("artifacts/contractor-works-bundle-cutover-v1.json", artifact);
  writeArtifact("artifacts/contractor-works-bundle-cutover-v1.summary.json", {
    status: artifact.status,
    gate: artifact.gate,
    profile: artifact.profile,
    legacy: artifact.legacy,
    rpc: artifact.rpc,
    primary: artifact.primary,
    serviceBoundary: artifact.serviceBoundary,
    parity: artifact.parity,
    topSlowFetches: summary.topSlowFetches.slice(0, 5),
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        gate: artifact.gate,
        primaryOwner: primary.result.sourceMeta.primaryOwner,
        fallbackUsed: primary.result.sourceMeta.fallbackUsed,
        backendFirstPrimary: primary.result.sourceMeta.backendFirstPrimary === true,
        legacyDurationMs: legacy.durationMs,
        rpcDurationMs: rpc.durationMs,
        primaryDurationMs: primary.durationMs,
        rpcRowParityOk,
        rpcSubcontractParityOk,
        primaryRowParityOk,
        primarySubcontractParityOk,
      },
      null,
      2,
    ),
  );
}

void main();

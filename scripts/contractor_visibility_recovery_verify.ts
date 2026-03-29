import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import { loadContractorInboxScope } from "../src/lib/api/contractor.scope.service";
import { bootstrapWorkModalData } from "../src/screens/contractor/contractor.workModalBootstrap";
import { isApprovedForOtherStatus } from "../src/screens/contractor/contractor.status";
import { loadContractorWorksBundle } from "../src/screens/contractor/contractor.loadWorksService";
import {
  buildCompatibilityInboxRows,
  buildCompatibilityWorkRow,
  resolveContractorScreenContract,
} from "../src/screens/contractor/contractor.visibilityRecovery";
import {
  isExcludedWorkCode,
  looksLikeUuid,
  normText,
  pickWorkProgressRow,
} from "../src/screens/contractor/contractor.utils";

type ContractorRecord = {
  id: string;
  user_id: string;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
  inn: string | null;
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "contractor-visibility-recovery-verify" } },
});

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const countBy = <T extends string | number>(values: T[]) =>
  values.reduce<Record<string, number>>((acc, value) => {
    const key = String(value);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

async function selectRecoverableContractor() {
  const { data: contractors, error: contractorError } = await admin
    .from("contractors")
    .select("id, user_id, company_name, full_name, phone, inn")
    .not("user_id", "is", null)
    .limit(100);
  if (contractorError) throw contractorError;

  const candidateContractors = (contractors ?? []) as ContractorRecord[];
  const userIds = candidateContractors.map((entry) => entry.user_id);
  const { data: userProfiles, error: userProfileError } = await admin
    .from("user_profiles")
    .select("user_id, is_contractor")
    .in("user_id", userIds);
  if (userProfileError) throw userProfileError;

  const contractorUserIds = new Set(
    (userProfiles ?? [])
      .filter((entry) => entry.is_contractor === true)
      .map((entry) => String(entry.user_id || "").trim())
      .filter(Boolean),
  );

  let compatibilityCandidate:
    | {
        contractor: ContractorRecord;
        canonical: Awaited<ReturnType<typeof loadContractorInboxScope>>;
        bundle: Awaited<ReturnType<typeof loadContractorWorksBundle>>;
        compatibilityRows: ReturnType<typeof buildCompatibilityInboxRows>;
        screenContract: ReturnType<typeof resolveContractorScreenContract>;
      }
    | null = null;

  for (const contractor of candidateContractors) {
    if (!contractorUserIds.has(String(contractor.user_id || "").trim())) continue;

    const canonical = await loadContractorInboxScope({
      supabaseClient: admin as never,
      myContractorId: contractor.id,
      isStaff: false,
    });

    const bundle = await loadContractorWorksBundle({
      supabaseClient: admin as never,
      normText,
      looksLikeUuid,
      pickWorkProgressRow,
      myContractorId: contractor.id,
      myUserId: contractor.user_id,
      myContractorInn: String(contractor.inn || "").replace(/\D+/g, "") || null,
      myContractorCompany: contractor.company_name,
      myContractorFullName: contractor.full_name,
      isStaff: false,
      isExcludedWorkCode,
      isApprovedForOtherStatus,
    });

    const compatibilityRows =
      canonical.rows.length > 0
        ? []
        : buildCompatibilityInboxRows({
            rows: bundle.rows,
            subcontractCards: bundle.subcontractCards,
            contractor,
          });
    const screenContract = resolveContractorScreenContract({
      canonicalRows: canonical.rows,
      canonicalMeta: canonical.meta,
      compatibilityRows,
      hasContractorIdentity: true,
      loadError: null,
    });

    if (canonical.rows.length > 0) {
      return {
        contractor,
        canonical,
        bundle,
        compatibilityRows,
        screenContract,
      };
    }

    if (!compatibilityCandidate && compatibilityRows.length > 0) {
      compatibilityCandidate = {
        contractor,
        canonical,
        bundle,
        compatibilityRows,
        screenContract,
      };
    }
  }

  return compatibilityCandidate;
}

async function main() {
  const target = await selectRecoverableContractor();
  if (!target) {
    throw new Error("No recoverable contractor scenario found in current dataset");
  }

  const effectiveRows = target.canonical.rows.length > 0 ? target.canonical.rows : target.compatibilityRows;
  const scopedSubcontractIds = target.bundle.subcontractCards.map((entry) => String(entry.id || "").trim()).filter(Boolean);
  const adminUntyped = admin as unknown as {
    from: (relation: string) => {
      select: (columns: string) => {
        in: (column: string, values: string[]) => Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>;
        eq: (column: string, value: string) => Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>;
      };
    };
  };
  const rawQuery = scopedSubcontractIds.length
    ? await adminUntyped
        .from("v_contractor_publication_candidates_v1")
        .select("work_item_id, publication_state, contractor_id, source_kind, source_subcontract_id, source_request_id, is_material")
        .in("source_subcontract_id", scopedSubcontractIds)
    : await adminUntyped
        .from("v_contractor_publication_candidates_v1")
        .select("work_item_id, publication_state, contractor_id, source_kind, source_subcontract_id, source_request_id, is_material")
        .eq("contractor_id", target.contractor.id);
  if (rawQuery.error) throw rawQuery.error;
  const rawRows = rawQuery.data ?? [];

  const creatorOwnedSubcontractCount = target.bundle.subcontractCards.filter(
    (entry) => String(entry.created_by || "").trim() === String(target.contractor.user_id || "").trim(),
  ).length;

  const firstEffectiveRow = effectiveRows[0] ?? null;
  const bootstrap =
    firstEffectiveRow == null
      ? null
      : await bootstrapWorkModalData({
          supabaseClient: admin as never,
          row: buildCompatibilityWorkRow(firstEffectiveRow),
          readOnly: true,
          loadWorkLogData: async () => [],
          myContractorId: target.contractor.id,
          isStaff: false,
        });

  const rawVsCanonical = {
    contractorId: target.contractor.id,
    contractorUserId: target.contractor.user_id,
    rawRowCount: rawRows.length,
    canonicalRowCount: target.canonical.rows.length,
    compatibilityRowCount: target.compatibilityRows.length,
    effectiveRowCount: effectiveRows.length,
    filteredRowCount: Math.max(0, rawRows.length - effectiveRows.length),
    filterReasons: countBy(rawRows.map((row) => String(row["publication_state"] ?? "unknown"))),
    sourceKinds: countBy(rawRows.map((row) => String(row["source_kind"] ?? "unknown"))),
  };

  const assignmentMatch = {
    contractorId: target.contractor.id,
    contractorUserId: target.contractor.user_id,
    contractorCompanyName: target.contractor.company_name,
    contractorInn: target.contractor.inn,
    scopedSubcontractCount: target.bundle.subcontractCards.length,
    creatorOwnedSubcontractCount,
    canonicalReadyRows: target.canonical.rows.length,
    compatibilityReadyRows: target.compatibilityRows.length,
    recoverySource: target.screenContract.source,
    recoveryUsed: target.screenContract.source === "compatibility_recovery",
    scopedSubcontractIds: scopedSubcontractIds.slice(0, 20),
  };

  const errorContract = resolveContractorScreenContract({
    canonicalRows: [],
    canonicalMeta: null,
    compatibilityRows: [],
    hasContractorIdentity: true,
    loadError: new Error("contractor_scope_failed"),
  });
  const degradedContract = resolveContractorScreenContract({
    canonicalRows: [],
    canonicalMeta: null,
    compatibilityRows: [],
    hasContractorIdentity: false,
    loadError: null,
  });

  const screenStateProof = {
    contractorId: target.contractor.id,
    screenState: target.screenContract.state,
    screenSource: target.screenContract.source,
    screenMessage: target.screenContract.message,
    visibleRowCount: effectiveRows.length,
    invalidMaterialVisible: effectiveRows.some((row) => row.work.isMaterial),
    emptyStateSeparatedFromError: errorContract.state === "error",
    degradedStateSeparatedFromEmpty: degradedContract.state === "degraded",
    detailHeaderMatches:
      firstEffectiveRow != null &&
      bootstrap != null &&
      bootstrap.jobHeader?.work_type === firstEffectiveRow.work.workName &&
      bootstrap.jobHeader?.object_name === firstEffectiveRow.location.objectName,
    detailLoadState: bootstrap?.loadState ?? null,
  };

  const summary = {
    gate: "contractor_visibility_recovery",
    contractorId: target.contractor.id,
    contractorUserId: target.contractor.user_id,
    contractorCompanyName: target.contractor.company_name,
    canonicalRows: target.canonical.rows.length,
    compatibilityRows: target.compatibilityRows.length,
    effectiveRows: effectiveRows.length,
    rawRows: rawRows.length,
    filteredRows: rawVsCanonical.filteredRowCount,
    screenState: target.screenContract.state,
    screenSource: target.screenContract.source,
    creatorOwnedSubcontractCount,
    canonicalRecovered: target.canonical.rows.length > 0 && target.screenContract.source === "canonical",
    status:
      target.canonical.rows.length > 0 &&
      target.screenContract.state === "ready" &&
      target.screenContract.source === "canonical" &&
      effectiveRows.length > 0 &&
      !screenStateProof.invalidMaterialVisible &&
      screenStateProof.emptyStateSeparatedFromError &&
      screenStateProof.degradedStateSeparatedFromEmpty &&
      screenStateProof.detailHeaderMatches &&
      screenStateProof.detailLoadState === "ready"
        ? "GREEN"
        : "NOT GREEN",
  };

  writeJson("artifacts/contractor-visibility-recovery-summary.json", summary);
  writeJson("artifacts/contractor-scope-raw-vs-canonical.json", rawVsCanonical);
  writeJson("artifacts/contractor-assignment-match-check.json", assignmentMatch);
  writeJson("artifacts/contractor-screen-state-proof.json", screenStateProof);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();

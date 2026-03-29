import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import {
  loadContractorInboxScope,
  type ContractorInboxRow,
} from "../src/lib/api/contractor.scope.service";
import {
  buildContractorCardModels,
  type ContractorWorkCardModel,
} from "../src/screens/contractor/contractor.cardModel";
import {
  loadContractorWorksBundle,
  type ContractorWorksBundleResult,
} from "../src/screens/contractor/contractor.loadWorksService";
import { isApprovedForOtherStatus } from "../src/screens/contractor/contractor.status";
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
  inn: string | null;
};

type RawCanonicalCandidateRow = {
  work_item_id: string;
  progress_id: string | null;
  source_subcontract_id: string | null;
  source_request_id: string | null;
  contractor_id: string | null;
  contractor_name: string | null;
  work_name: string | null;
  object_name: string | null;
  system_name: string | null;
  zone_name: string | null;
  publication_state: string | null;
};

type SubcontractRow = {
  id: string;
  contractor_org: string | null;
  contractor_inn: string | null;
  object_name: string | null;
  work_type: string | null;
  work_zone: string | null;
};

type RequestRow = {
  id: string;
  subcontract_id: string | null;
  contractor_job_id: string | null;
  status: string | null;
  object_type_code: string | null;
  object_name: string | null;
  system_code: string | null;
  zone_code: string | null;
  level_code: string | null;
  company_name_snapshot: string | null;
  company_inn_snapshot: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type DictRow = {
  code: string;
  display_name: string | null;
  name_human_ru: string | null;
  name_ru: string | null;
  name: string | null;
};

type Candidate = {
  contractor: ContractorRecord;
  canonical: Awaited<ReturnType<typeof loadContractorInboxScope>>;
  bundle: ContractorWorksBundleResult;
  cards: ContractorWorkCardModel[];
  rawRows: RawCanonicalCandidateRow[];
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
  global: { headers: { "x-client-info": "contractor-canonical-quality-verify" } },
});

const writeJson = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value || "").trim();
const isCodeLike = (value: unknown) => /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(trim(value));

const countBy = <T extends string>(values: T[]) =>
  values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const pickBestRequest = (rows: RequestRow[]): RequestRow | null => {
  const rank = (status: string | null) => {
    const normalized = trim(status).toLowerCase();
    if (normalized === "утверждено" || normalized === "approved") return 0;
    if (normalized.includes("закуп")) return 1;
    if (normalized.includes("утвержд")) return 2;
    if (normalized.includes("чернов")) return 4;
    return 3;
  };

  return [...rows].sort((left, right) => {
    const rankDelta = rank(left.status) - rank(right.status);
    if (rankDelta !== 0) return rankDelta;
    const submittedDelta = trim(right.submitted_at).localeCompare(trim(left.submitted_at));
    if (submittedDelta !== 0) return submittedDelta;
    const createdDelta = trim(right.created_at).localeCompare(trim(left.created_at));
    if (createdDelta !== 0) return createdDelta;
    return trim(right.id).localeCompare(trim(left.id));
  })[0] ?? null;
};

const dictDisplay = (rows: DictRow[], code: string | null | undefined) => {
  const normalized = trim(code);
  if (!normalized) return null;
  const row = rows.find((entry) => trim(entry.code) === normalized);
  return trim(row?.display_name) || trim(row?.name_human_ru) || trim(row?.name_ru) || trim(row?.name) || null;
};

async function loadContractors() {
  const { data: contractors, error: contractorError } = await admin
    .from("contractors")
    .select("id, user_id, company_name, full_name, inn")
    .not("user_id", "is", null)
    .limit(200);
  if (contractorError) throw contractorError;

  const contractorRows = (contractors ?? []) as ContractorRecord[];
  const userIds = contractorRows.map((entry) => entry.user_id);
  const { data: userProfiles, error: userProfileError } = await admin
    .from("user_profiles")
    .select("user_id, is_contractor")
    .in("user_id", userIds);
  if (userProfileError) throw userProfileError;

  const contractorUserIds = new Set(
    (userProfiles ?? [])
      .filter((entry) => entry.is_contractor === true)
      .map((entry) => trim(entry.user_id))
      .filter(Boolean),
  );

  return contractorRows.filter((entry) => contractorUserIds.has(trim(entry.user_id)));
}

async function loadCandidate(contractor: ContractorRecord): Promise<Candidate> {
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
    myContractorInn: contractor.inn,
    myContractorCompany: contractor.company_name,
    myContractorFullName: contractor.full_name,
    isStaff: false,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  });

  const cardModels = buildContractorCardModels({
    inboxRows: canonical.rows,
    rows: bundle.rows,
  });

  const adminUntyped = admin as unknown as {
    from: (relation: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          eq: (
            nextColumn: string,
            nextValue: string,
          ) => Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>;
        };
      };
    };
  };

  const { data: rawRows, error: rawRowsError } = await adminUntyped
    .from("v_contractor_publication_candidates_v1")
    .select(
      "work_item_id, progress_id, source_subcontract_id, source_request_id, contractor_id, contractor_name, work_name, object_name, system_name, zone_name, publication_state",
    )
    .eq("contractor_id", contractor.id)
    .eq("publication_state", "ready");
  if (rawRowsError) throw rawRowsError;

  return {
    contractor,
    canonical,
    bundle,
    cards: cardModels.cards,
    rawRows: ((rawRows ?? []) as unknown as RawCanonicalCandidateRow[]),
  };
}

async function main() {
  const contractors = await loadContractors();
  let target: Candidate | null = null;

  for (const contractor of contractors) {
    const candidate = await loadCandidate(contractor);
    if (candidate.canonical.rows.length === 0) continue;
    if (
      candidate.canonical.meta.legacyFilteredOut > 0 ||
      candidate.canonical.meta.historicalExcluded > 0 ||
      candidate.rawRows.some((row) => isCodeLike(row.work_name) || isCodeLike(row.object_name))
    ) {
      target = candidate;
      break;
    }
    if (!target) target = candidate;
  }

  if (!target) {
    throw new Error("No contractor with canonical rows found for quality verification");
  }

  const canonicalRowById = new Map(target.canonical.rows.map((row) => [row.workItemId, row]));
  const rawSubcontractIds = [...new Set(target.rawRows.map((row) => trim(row.source_subcontract_id)).filter(Boolean))];
  const rawRequestIds = [...new Set(target.rawRows.map((row) => trim(row.source_request_id)).filter(Boolean))];

  const [subcontractsRes, reqBySubRes, reqByJobRes] = await Promise.all([
    rawSubcontractIds.length
      ? admin
          .from("subcontracts")
          .select("id, contractor_org, contractor_inn, object_name, work_type, work_zone")
          .in("id", rawSubcontractIds)
      : Promise.resolve({ data: [], error: null }),
    rawSubcontractIds.length
      ? admin
          .from("requests")
          .select(
            "id, subcontract_id, contractor_job_id, status, object_type_code, object_name, system_code, zone_code, level_code, company_name_snapshot, company_inn_snapshot, submitted_at, created_at",
          )
          .in("subcontract_id", rawSubcontractIds)
      : Promise.resolve({ data: [], error: null }),
    rawSubcontractIds.length
      ? admin
          .from("requests")
          .select(
            "id, subcontract_id, contractor_job_id, status, object_type_code, object_name, system_code, zone_code, level_code, company_name_snapshot, company_inn_snapshot, submitted_at, created_at",
          )
          .in("contractor_job_id", rawSubcontractIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subcontractsRes.error) throw subcontractsRes.error;
  if (reqBySubRes.error) throw reqBySubRes.error;
  if (reqByJobRes.error) throw reqByJobRes.error;

  const requestRows = [...((reqBySubRes.data ?? []) as RequestRow[]), ...((reqByJobRes.data ?? []) as RequestRow[])];
  const requestsBySubcontract = new Map<string, RequestRow[]>();
  for (const row of requestRows) {
    const key = trim(row.subcontract_id) || trim(row.contractor_job_id);
    if (!key) continue;
    const bucket = requestsBySubcontract.get(key) ?? [];
    bucket.push(row);
    requestsBySubcontract.set(key, bucket);
  }

  const requestsById = new Map(
    requestRows.map((row) => [trim(row.id), row]).filter((entry): entry is [string, RequestRow] => Boolean(entry[0])),
  );
  const bestRequests = new Map<string, RequestRow>();
  for (const [subcontractId, rows] of requestsBySubcontract.entries()) {
    const best = pickBestRequest(rows);
    if (best) bestRequests.set(subcontractId, best);
  }

  for (const requestId of rawRequestIds) {
    const request = requestsById.get(requestId);
    if (request) bestRequests.set(requestId, request);
  }

  const systemCodes = [...new Set(requestRows.map((row) => trim(row.system_code)).filter(Boolean))];
  const objectCodes = [...new Set(requestRows.map((row) => trim(row.object_type_code)).filter(Boolean))];
  const zoneCodes = [...new Set(requestRows.map((row) => trim(row.zone_code)).filter(Boolean))];
  const levelCodes = [...new Set(requestRows.map((row) => trim(row.level_code)).filter(Boolean))];

  const [systemsRes, objectsRes, zonesRes, levelsRes] = await Promise.all([
    systemCodes.length
      ? admin.from("ref_systems").select("code, display_name, name_human_ru, name_ru, name").in("code", systemCodes)
      : Promise.resolve({ data: [], error: null }),
    objectCodes.length
      ? admin.from("ref_object_types").select("code, display_name, name_human_ru, name_ru, name").in("code", objectCodes)
      : Promise.resolve({ data: [], error: null }),
    zoneCodes.length
      ? admin.from("ref_zones").select("code, display_name, name_human_ru, name_ru, name").in("code", zoneCodes)
      : Promise.resolve({ data: [], error: null }),
    levelCodes.length
      ? admin.from("ref_levels").select("code, display_name, name_human_ru, name_ru, name").in("code", levelCodes)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (systemsRes.error) throw systemsRes.error;
  if (objectsRes.error) throw objectsRes.error;
  if (zonesRes.error) throw zonesRes.error;
  if (levelsRes.error) throw levelsRes.error;

  const subcontracts = (subcontractsRes.data ?? []) as SubcontractRow[];
  const subcontractsById = new Map(
    subcontracts.map((row) => [trim(row.id), row]).filter((entry): entry is [string, SubcontractRow] => Boolean(entry[0])),
  );

  const annotatedRows = target.rawRows.map((row) => {
    const subcontract = subcontractsById.get(trim(row.source_subcontract_id)) ?? null;
    const request =
      requestsById.get(trim(row.source_request_id)) ??
      bestRequests.get(trim(row.source_subcontract_id)) ??
      null;
    const canonicalRow = canonicalRowById.get(trim(row.work_item_id)) ?? null;
    const resolvedObject =
      dictDisplay((objectsRes.data ?? []) as DictRow[], request?.object_type_code) ??
      dictDisplay((objectsRes.data ?? []) as DictRow[], subcontract?.object_name);
    const resolvedSystem =
      dictDisplay((systemsRes.data ?? []) as DictRow[], request?.system_code) ??
      dictDisplay((systemsRes.data ?? []) as DictRow[], subcontract?.work_type);
    const resolvedZone = dictDisplay((zonesRes.data ?? []) as DictRow[], request?.zone_code);
    const resolvedLevel =
      dictDisplay((levelsRes.data ?? []) as DictRow[], request?.level_code) ??
      dictDisplay((levelsRes.data ?? []) as DictRow[], subcontract?.work_zone);

    return {
      workItemId: row.work_item_id,
      progressId: row.progress_id,
      rawContractorName: row.contractor_name,
      rawWorkName: row.work_name,
      rawObjectName: row.object_name,
      rawSystemName: row.system_name,
      rawZoneName: row.zone_name,
      rawCodeLikeTitle: isCodeLike(row.work_name),
      rawCodeLikeObject: isCodeLike(row.object_name),
      requestStatus: request?.status ?? null,
      subcontractContractorOrg: subcontract?.contractor_org ?? null,
      subcontractWorkType: subcontract?.work_type ?? null,
      resolvedObject,
      resolvedSystem,
      resolvedZone,
      resolvedLevel,
      canonical: canonicalRow
        ? {
            contractorName: canonicalRow.identity.contractorName,
            title: canonicalRow.work.workName,
            titleSource: canonicalRow.work.workNameSource,
            objectName: canonicalRow.location.objectName,
            systemName: canonicalRow.location.systemName,
            zoneName: canonicalRow.location.zoneName,
            currentWorkState: canonicalRow.diagnostics.currentWorkState,
            contractorNameSource: canonicalRow.diagnostics.contractorNameSource,
            objectNameSource: canonicalRow.diagnostics.objectNameSource,
          }
        : null,
      excludedFromCanonical: canonicalRow == null,
    };
  });

  const contractorQualityMapArtifact = {
    generatedAt: new Date().toISOString(),
    contractorId: target.contractor.id,
    contractorCompanyName: target.contractor.company_name,
    rawReadyRows: target.rawRows.length,
    canonicalRows: target.canonical.rows.length,
    meta: target.canonical.meta,
    rawCodeLikeRows: annotatedRows.filter((row) => row.rawCodeLikeTitle || row.rawCodeLikeObject).length,
    canonicalCurrentWorkStates: countBy(target.canonical.rows.map((row) => row.diagnostics.currentWorkState)),
    canonicalTitleSources: countBy(target.canonical.rows.map((row) => row.work.workNameSource)),
    canonicalContractorNameSources: countBy(target.canonical.rows.map((row) => row.diagnostics.contractorNameSource)),
    canonicalObjectNameSources: countBy(target.canonical.rows.map((row) => row.diagnostics.objectNameSource)),
    excludedRawRows: annotatedRows.filter((row) => row.excludedFromCanonical).slice(0, 12),
    recoveredRawRows: annotatedRows
      .filter(
        (row) =>
          row.canonical != null &&
          (trim(row.rawContractorName) !== trim(row.canonical.contractorName) ||
            trim(row.rawWorkName) !== trim(row.canonical.title) ||
            trim(row.rawObjectName) !== trim(row.canonical.objectName)),
      )
      .slice(0, 12),
  };

  const currentVsLegacyArtifact = {
    generatedAt: new Date().toISOString(),
    contractorId: target.contractor.id,
    canonicalCurrentRows: target.canonical.rows.slice(0, 16).map((row) => ({
      workItemId: row.workItemId,
      contractorName: row.identity.contractorName,
      title: row.work.workName,
      objectName: row.location.objectName,
      systemName: row.location.systemName,
      zoneName: row.location.zoneName,
      currentWorkState: row.diagnostics.currentWorkState,
      titleSource: row.work.workNameSource,
      contractorNameSource: row.diagnostics.contractorNameSource,
      objectNameSource: row.diagnostics.objectNameSource,
    })),
    rawLegacyRowsExcluded: annotatedRows
      .filter((row) => row.excludedFromCanonical)
      .slice(0, 16),
  };

  const currentWorkProofArtifact = {
    generatedAt: new Date().toISOString(),
    contractorId: target.contractor.id,
    screenSource: "canonical_current_work",
    canonicalRows: target.canonical.rows.length,
    readyCurrentRows: target.canonical.meta.readyCurrentRows,
    readyCurrentDegradedTitle: target.canonical.meta.readyCurrentDegradedTitle,
    legacyFilteredOut: target.canonical.meta.legacyFilteredOut,
    historicalExcluded: target.canonical.meta.historicalExcluded,
    cardSourceKinds: countBy(target.cards.map((card) => card.sourceKind)),
    cardQualityStates: countBy(target.cards.map((card) => card.qualityState)),
    canonicalTitlesCodeLike: target.canonical.rows.filter((row) => isCodeLike(row.work.workName)).length,
    canonicalObjectsCodeLike: target.canonical.rows.filter((row) => isCodeLike(row.location.objectName)).length,
    canonicalCurrentRowsHumanized:
      target.canonical.rows.every((row) => !isCodeLike(row.work.workName) && !isCodeLike(row.location.objectName)),
    cardsSample: target.cards.slice(0, 12).map((card) => ({
      workId: card.workId,
      contractorName: card.contractorName,
      title: card.title,
      objectName: card.objectName,
      qualityState: card.qualityState,
      sourceKind: card.sourceKind,
    })),
  };

  const titleDerivationProofArtifact = {
    generatedAt: new Date().toISOString(),
    contractorId: target.contractor.id,
    rows: annotatedRows
      .filter(
        (row) =>
          row.rawCodeLikeTitle ||
          row.rawCodeLikeObject ||
          trim(row.rawContractorName) !== trim(row.canonical?.contractorName),
      )
      .slice(0, 16)
      .map((row) => ({
        workItemId: row.workItemId,
        raw: {
          contractorName: row.rawContractorName,
          workName: row.rawWorkName,
          objectName: row.rawObjectName,
          systemName: row.rawSystemName,
          zoneName: row.rawZoneName,
        },
        resolverInputs: {
          requestStatus: row.requestStatus,
          subcontractContractorOrg: row.subcontractContractorOrg,
          subcontractWorkType: row.subcontractWorkType,
          resolvedSystem: row.resolvedSystem,
          resolvedObject: row.resolvedObject,
          resolvedZone: row.resolvedZone,
          resolvedLevel: row.resolvedLevel,
        },
        canonical: row.canonical,
        effects: {
          contractorRecovered:
            row.canonical != null && trim(row.rawContractorName) !== trim(row.canonical.contractorName),
          titleRecovered: row.canonical != null && trim(row.rawWorkName) !== trim(row.canonical.title),
          objectRecovered: row.canonical != null && trim(row.rawObjectName) !== trim(row.canonical.objectName),
          excludedAsLegacyOrHistorical: row.excludedFromCanonical,
        },
      })),
  };

  const smokeArtifact = {
    generatedAt: new Date().toISOString(),
    smoke1: {
      name: "current approved contractor works stay primary in canonical scope",
      pass: target.canonical.rows.length > 0 && target.canonical.meta.readyCurrentRows > 0,
    },
    smoke2: {
      name: "legacy or historical raw rows do not survive into canonical current-work list",
      pass:
        annotatedRows.filter((row) => row.rawCodeLikeTitle || row.rawCodeLikeObject).every(
          (row) =>
            row.excludedFromCanonical ||
            (row.canonical != null &&
              !isCodeLike(row.canonical.title) &&
              !isCodeLike(row.canonical.objectName)),
        ),
    },
    smoke3: {
      name: "degraded title state is explicit instead of silently using legacy labels",
      pass:
        target.canonical.rows.every(
          (row) =>
            row.diagnostics.currentWorkState === "ready_current" ||
            row.diagnostics.currentWorkState === "ready_current_degraded_title",
        ),
    },
    smoke4: {
      name: "contractor screen no longer looks like first-version code rows",
      pass:
        target.canonical.rows.every((row) => !isCodeLike(row.work.workName) && !isCodeLike(row.location.objectName)),
    },
  };

  writeJson("artifacts/contractor-canonical-source-quality-map.json", contractorQualityMapArtifact);
  writeJson("artifacts/contractor-current-vs-legacy-rows.json", currentVsLegacyArtifact);
  writeJson("artifacts/contractor-current-work-proof.json", currentWorkProofArtifact);
  writeJson("artifacts/contractor-title-derivation-proof.json", titleDerivationProofArtifact);
  writeJson("artifacts/contractor-canonical-quality-smoke.json", smokeArtifact);

  console.log(
    JSON.stringify(
      {
        contractorId: target.contractor.id,
        canonicalRows: target.canonical.rows.length,
        readyCurrentRows: target.canonical.meta.readyCurrentRows,
        readyCurrentDegradedTitle: target.canonical.meta.readyCurrentDegradedTitle,
        legacyFilteredOut: target.canonical.meta.legacyFilteredOut,
        historicalExcluded: target.canonical.meta.historicalExcluded,
        smoke1: smokeArtifact.smoke1.pass,
        smoke2: smokeArtifact.smoke2.pass,
        smoke3: smokeArtifact.smoke3.pass,
        smoke4: smokeArtifact.smoke4.pass,
      },
      null,
      2,
    ),
  );

  if (!smokeArtifact.smoke1.pass || !smokeArtifact.smoke2.pass || !smokeArtifact.smoke3.pass || !smokeArtifact.smoke4.pass) {
    process.exitCode = 1;
  }
}

void main();

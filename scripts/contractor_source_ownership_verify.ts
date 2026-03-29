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
  type ContractorWorkRow,
  type ContractorWorksBundleResult,
} from "../src/screens/contractor/contractor.loadWorksService";
import { isApprovedForOtherStatus } from "../src/screens/contractor/contractor.status";
import {
  buildCompatibilityInboxRows,
  resolveContractorScreenContract,
  type ContractorScreenContract,
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
  inn: string | null;
  phone: string | null;
};

type Candidate = {
  contractor: ContractorRecord;
  bundle: ContractorWorksBundleResult;
  canonicalRows: ContractorInboxRow[];
  compatibilityRows: ContractorInboxRow[];
  screenContract: ContractorScreenContract;
  canonicalCards: ContractorWorkCardModel[];
  compatibilityCards: ContractorWorkCardModel[];
  effectiveCards: ContractorWorkCardModel[];
  effectiveTechnicalRows: Map<string, ContractorWorkRow>;
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
  global: { headers: { "x-client-info": "contractor-source-ownership-verify" } },
});

const writeJson = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value || "").trim();

const countBy = <T extends string>(values: T[]) =>
  values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const sampleInboxRows = (rows: ContractorInboxRow[]) =>
  rows.slice(0, 8).map((row) => ({
    workItemId: row.workItemId,
    progressId: row.progressId,
    sourceKind: row.origin.sourceKind,
    sourceSubcontractId: row.origin.sourceSubcontractId,
    sourceVersion: row.diagnostics.sourceVersion,
    workName: row.work.workName,
    workNameSource: row.work.workNameSource,
    objectName: row.location.objectName,
    contractorName: row.identity.contractorName,
  }));

const sampleCards = (rows: ContractorWorkCardModel[]) =>
  rows.slice(0, 8).map((row) => ({
    workId: row.workId,
    title: row.title,
    objectName: row.objectName,
    systemName: row.systemName,
    zoneName: row.zoneName,
    contractorName: row.contractorName,
    status: row.status,
    isCanonical: row.isCanonical,
    sourceKind: row.sourceKind,
    progressId: row.progressId,
  }));

async function loadContractorCandidates() {
  const { data: contractors, error: contractorsError } = await admin
    .from("contractors")
    .select("id, user_id, company_name, full_name, inn, phone")
    .not("user_id", "is", null)
    .limit(200);
  if (contractorsError) throw contractorsError;

  const contractorRows = (contractors ?? []) as ContractorRecord[];
  const userIds = contractorRows.map((row) => row.user_id);
  const { data: userProfiles, error: userProfilesError } = await admin
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

async function loadCandidate(contractor: ContractorRecord): Promise<Candidate> {
  const canonicalScope = await loadContractorInboxScope({
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

  const compatibilityRows = buildCompatibilityInboxRows({
    rows: bundle.rows,
    subcontractCards: bundle.subcontractCards,
    contractor,
  });
  const screenContract = resolveContractorScreenContract({
    canonicalRows: canonicalScope.rows,
    canonicalMeta: canonicalScope.meta,
    compatibilityRows,
    hasContractorIdentity: true,
    loadError: null,
  });
  const canonicalCardModels = buildContractorCardModels({
    inboxRows: canonicalScope.rows,
    rows: bundle.rows,
  });
  const compatibilityCardModels = buildContractorCardModels({
    inboxRows: compatibilityRows,
    rows: bundle.rows,
  });
  const effectiveCardModels = buildContractorCardModels({
    inboxRows: canonicalScope.rows.length > 0 ? canonicalScope.rows : compatibilityRows,
    rows: bundle.rows,
  });

  return {
    contractor,
    bundle,
    canonicalRows: canonicalScope.rows,
    compatibilityRows,
    screenContract,
    canonicalCards: canonicalCardModels.cards,
    compatibilityCards: compatibilityCardModels.cards,
    effectiveCards: effectiveCardModels.cards,
    effectiveTechnicalRows: effectiveCardModels.workRowByCardId,
  };
}

async function main() {
  const contractors = await loadContractorCandidates();

  let canonicalCandidate: Candidate | null = null;
  let dualSourceCandidate: Candidate | null = null;
  let compatOnlyCandidate: Candidate | null = null;

  for (const contractor of contractors) {
    const candidate = await loadCandidate(contractor);
    if (!canonicalCandidate && candidate.canonicalRows.length > 0) {
      canonicalCandidate = candidate;
    }
    if (
      !dualSourceCandidate &&
      candidate.canonicalRows.length > 0 &&
      candidate.compatibilityRows.length > 0
    ) {
      dualSourceCandidate = candidate;
    }
    if (!compatOnlyCandidate && candidate.canonicalRows.length === 0 && candidate.compatibilityRows.length > 0) {
      compatOnlyCandidate = candidate;
    }
    if (canonicalCandidate && dualSourceCandidate && compatOnlyCandidate) {
      break;
    }
  }

  if (!canonicalCandidate) {
    throw new Error("No contractor with canonical rows found in current dataset");
  }

  const renderProofCandidate = dualSourceCandidate ?? canonicalCandidate;
  const firstEffectiveCard = renderProofCandidate.effectiveCards[0] ?? null;
  const firstEffectiveRow =
    (firstEffectiveCard && renderProofCandidate.effectiveTechnicalRows.get(firstEffectiveCard.workId)) ?? null;
  const firstCanonicalRow =
    (firstEffectiveCard &&
      renderProofCandidate.canonicalRows.find((row) => row.workItemId === firstEffectiveCard.workId)) ??
    null;

  const precedenceArtifact = {
    generatedAt: new Date().toISOString(),
    candidateContractorId: renderProofCandidate.contractor.id,
    screen: {
      route: "app/(tabs)/contractor.tsx",
      primaryListComponent: "src/screens/contractor/components/ContractorSubcontractsList.tsx",
      cardHook: "src/screens/contractor/hooks/useContractorCards.ts",
      screenDataHook: "src/screens/contractor/hooks/useContractorScreenData.ts",
    },
    sources: [
      {
        id: "canonical_inbox_scope",
        kind: "canonical",
        owner: "rpc:contractor_inbox_scope_v1",
        shape: "ContractorInboxRow[]",
      },
      {
        id: "works_bundle",
        kind: "supporting_technical_bundle",
        owner: "loadContractorWorksBundle()",
        shape: "ContractorWorkRow[] + ContractorSubcontractCard[]",
      },
      {
        id: "compatibility_recovery",
        kind: "compatibility_fallback",
        owner: "buildCompatibilityInboxRows()",
        shape: "ContractorInboxRow[]",
      },
    ],
    precedence: [
      {
        priority: 1,
        sourceId: "canonical_inbox_scope",
        activationRule: "use when canonical inbox scope returns ready rows",
      },
      {
        priority: 2,
        sourceId: "compatibility_recovery",
        activationRule: "use only when canonical inbox scope is empty",
      },
      {
        priority: 3,
        sourceId: "works_bundle",
        activationRule: "never render list directly; technical row backing only",
      },
    ],
    renderPath: {
      load: [
        "loadContractorWorksBundle()",
        "loadContractorInboxScope()",
      ],
      selection: "effectiveInboxRows = canonicalRows.length > 0 ? canonicalRows : compatibilityRows",
      listModel: "buildContractorCardModels()",
      listRender: "ContractorSubcontractsList(data=contractorWorkCards)",
    },
    bundleSourceMeta: renderProofCandidate.bundle.sourceMeta,
    canonicalRows: renderProofCandidate.canonicalRows.length,
    compatibilityRows: renderProofCandidate.compatibilityRows.length,
    effectiveRows: renderProofCandidate.effectiveCards.length,
    chosenSource: renderProofCandidate.screenContract.source,
    renderState: renderProofCandidate.screenContract.renderState,
    precedenceDecision:
      renderProofCandidate.canonicalRows.length > 0 ? "canonical_inbox_scope" : "compatibility_recovery",
    canonicalWinsWhenAvailable:
      renderProofCandidate.canonicalRows.length > 0 &&
      renderProofCandidate.screenContract.source === "canonical" &&
      renderProofCandidate.effectiveCards.every((card) => card.sourceKind === "canonical"),
    legacyLeakGuards: [
      "compatibility rows prefer approved subcontract snapshot labels before matched legacy row labels",
      "technical work rows for open/modal preserve canonical title/object from inbox rows",
      "screen contract exposes ready_current vs ready_compat_degraded renderState",
    ],
    supportEvidence: {
      hasCanonicalRows: renderProofCandidate.screenContract.hasCanonicalRows,
      hasCompatibilityRows: renderProofCandidate.screenContract.hasCompatibilityRows,
      effectiveCardSourceKinds: countBy(renderProofCandidate.effectiveCards.map((card) => card.sourceKind)),
    },
  };

  const canonicalVsCompatArtifact = {
    generatedAt: new Date().toISOString(),
    contractorId: renderProofCandidate.contractor.id,
    contractorCompanyName: renderProofCandidate.contractor.company_name,
    canonicalRowsCount: renderProofCandidate.canonicalRows.length,
    compatibilityRowsCount: renderProofCandidate.compatibilityRows.length,
    effectiveRowsCount: renderProofCandidate.effectiveCards.length,
    renderState: renderProofCandidate.screenContract.renderState,
    chosenSource: renderProofCandidate.screenContract.source,
    canonicalRows: sampleInboxRows(renderProofCandidate.canonicalRows),
    compatibilityRows: sampleInboxRows(renderProofCandidate.compatibilityRows),
    effectiveCards: sampleCards(renderProofCandidate.effectiveCards),
    canonicalRowsChosenOverCompatibility:
      renderProofCandidate.canonicalRows.length > 0 &&
      renderProofCandidate.compatibilityRows.length > 0 &&
      renderProofCandidate.screenContract.source === "canonical" &&
      renderProofCandidate.effectiveCards.every((card) => card.sourceKind === "canonical"),
  };

  const renderSourceProofArtifact = {
    generatedAt: new Date().toISOString(),
    contractorId: renderProofCandidate.contractor.id,
    screenContract: renderProofCandidate.screenContract,
    bundleSourceMeta: renderProofCandidate.bundle.sourceMeta,
    effectiveCardContractKeys: Object.keys(firstEffectiveCard ?? {}),
    effectiveTechnicalRowSample:
      firstEffectiveRow == null
        ? null
        : {
            workItemId: firstEffectiveCard?.workId ?? null,
            progressId: firstEffectiveRow.progress_id,
            workName: firstEffectiveRow.work_name,
            workCode: firstEffectiveRow.work_code,
            objectName: firstEffectiveRow.object_name,
            canonicalWorkItemId: firstEffectiveRow.canonical_work_item_id ?? null,
            canonicalSourceKind: firstEffectiveRow.canonical_source_kind ?? null,
          },
    canonicalRowSample:
      firstCanonicalRow == null
        ? null
        : {
            workItemId: firstCanonicalRow.workItemId,
            title: firstCanonicalRow.work.workName,
            objectName: firstCanonicalRow.location.objectName,
            sourceVersion: firstCanonicalRow.diagnostics.sourceVersion,
          },
    uiContractPreserved:
      firstEffectiveCard != null &&
      firstEffectiveRow != null &&
      trim(firstEffectiveRow.canonical_work_item_id) === trim(firstEffectiveCard.workId) &&
      trim(firstEffectiveRow.work_name) === trim(firstEffectiveCard.title) &&
      trim(firstEffectiveRow.object_name) === trim(firstEffectiveCard.objectName),
  };

  const smokeArtifact = {
    generatedAt: new Date().toISOString(),
    smoke1: {
      name: "approved contractor works render from canonical source",
      pass:
        canonicalCandidate.canonicalRows.length > 0 &&
        canonicalCandidate.screenContract.source === "canonical" &&
        canonicalCandidate.effectiveCards.length > 0 &&
        canonicalCandidate.effectiveCards.every((card) => card.sourceKind === "canonical"),
      details: {
        contractorId: canonicalCandidate.contractor.id,
        canonicalRows: canonicalCandidate.canonicalRows.length,
        compatibilityRows: canonicalCandidate.compatibilityRows.length,
        chosenSource: canonicalCandidate.screenContract.source,
      },
    },
    smoke2: {
      name: "canonical rows win when canonical and compat both exist",
      pass:
        renderProofCandidate.canonicalRows.length > 0 &&
        renderProofCandidate.compatibilityRows.length > 0 &&
        renderProofCandidate.screenContract.source === "canonical" &&
        renderProofCandidate.screenContract.renderState === "ready_current",
      details: {
        contractorId: renderProofCandidate.contractor.id,
        canonicalRows: renderProofCandidate.canonicalRows.length,
        compatibilityRows: renderProofCandidate.compatibilityRows.length,
        chosenSource: renderProofCandidate.screenContract.source,
        renderState: renderProofCandidate.screenContract.renderState,
      },
    },
    smoke3: compatOnlyCandidate
      ? {
          name: "compat fallback is explicit degraded mode when canonical is empty",
          pass:
            compatOnlyCandidate.canonicalRows.length === 0 &&
            compatOnlyCandidate.compatibilityRows.length > 0 &&
            compatOnlyCandidate.screenContract.source === "compatibility_recovery" &&
            compatOnlyCandidate.screenContract.renderState === "ready_compat_degraded",
          details: {
            contractorId: compatOnlyCandidate.contractor.id,
            canonicalRows: compatOnlyCandidate.canonicalRows.length,
            compatibilityRows: compatOnlyCandidate.compatibilityRows.length,
            chosenSource: compatOnlyCandidate.screenContract.source,
            renderState: compatOnlyCandidate.screenContract.renderState,
          },
        }
      : {
          name: "compat fallback is explicit degraded mode when canonical is empty",
          pass: false,
          details: {
            skipped: true,
            reason: "No contractor with empty canonical rows and non-empty compat rows found in current dataset",
          },
        },
    smoke4: {
      name: "card model is built from current contract, not first-version label path",
      pass:
        firstEffectiveCard != null &&
        firstEffectiveRow != null &&
        firstCanonicalRow != null &&
        trim(firstEffectiveCard.title) === trim(firstCanonicalRow.work.workName) &&
        trim(firstEffectiveRow.work_name) === trim(firstCanonicalRow.work.workName) &&
        trim(firstEffectiveRow.object_name) === trim(firstCanonicalRow.location.objectName),
      details: {
        contractorId: renderProofCandidate.contractor.id,
        cardTitle: firstEffectiveCard?.title ?? null,
        canonicalTitle: firstCanonicalRow?.work.workName ?? null,
        technicalRowTitle: firstEffectiveRow?.work_name ?? null,
        cardObjectName: firstEffectiveCard?.objectName ?? null,
        canonicalObjectName: firstCanonicalRow?.location.objectName ?? null,
        technicalRowObjectName: firstEffectiveRow?.object_name ?? null,
      },
    },
  };

  writeJson("artifacts/contractor-source-precedence-map.json", precedenceArtifact);
  writeJson("artifacts/contractor-canonical-vs-compat-rows.json", canonicalVsCompatArtifact);
  writeJson("artifacts/contractor-render-source-proof.json", renderSourceProofArtifact);
  writeJson("artifacts/contractor-current-work-smoke.json", smokeArtifact);

  console.log(
    JSON.stringify(
      {
        contractorId: renderProofCandidate.contractor.id,
        chosenSource: renderProofCandidate.screenContract.source,
        renderState: renderProofCandidate.screenContract.renderState,
        canonicalRows: renderProofCandidate.canonicalRows.length,
        compatibilityRows: renderProofCandidate.compatibilityRows.length,
        smoke1: smokeArtifact.smoke1.pass,
        smoke2: smokeArtifact.smoke2.pass,
        smoke3: smokeArtifact.smoke3.pass,
        smoke4: smokeArtifact.smoke4.pass,
      },
      null,
      2,
    ),
  );

  if (
    !smokeArtifact.smoke1.pass ||
    !smokeArtifact.smoke2.pass ||
    !smokeArtifact.smoke4.pass
  ) {
    process.exitCode = 1;
  }
}

void main();

import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

const ROOT = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const BACKFILL_SUMMARY_PATH = path.join(ARTIFACTS_DIR, "identity-solidification-backfill-summary.json");
const PARITY_PATH = path.join(ARTIFACTS_DIR, "identity-solidification-parity.json");
const PROOF_PATH = path.join(ARTIFACTS_DIR, "identity-solidification-proof.md");

const parseEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
};

const ensureEnv = () => {
  parseEnvFile(path.join(ROOT, ".env.local"));
  parseEnvFile(path.join(ROOT, ".env"));

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("identity_solidification_verify_missing_supabase_env");
  }

  return { url, key };
};

const text = (value: unknown): string => String(value ?? "").trim();

const canonicalLegacyObjectName = (value: unknown): string => {
  const normalized = text(value)
    .replace(/\s+/g, " ")
    .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$/i, "")
    .trim();
  return normalized || "Без объекта";
};

const toCountMap = (values: Iterable<string>) => {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = text(value) || "Без объекта";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
};

const sortEntries = (map: Map<string, number>) =>
  Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key, "ru"));

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const isUuidLike = (value: string | null): boolean =>
  value != null &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function main() {
  const { url, key } = ensureEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [
    requestsCountRes,
    proposalItemsCountRes,
    purchasesCountRes,
    warehouseIssuesCountRes,
    shadowCountRes,
    requestsRes,
    identityRes,
    conflictsRes,
    requestItemsRes,
    proposalItemsRes,
    proposalsRes,
    purchasesRes,
    warehouseIssuesRes,
    transportScopeRes,
  ] = await Promise.all([
    supabase.from("requests").select("*", { count: "exact", head: true }),
    supabase.from("proposal_items").select("*", { count: "exact", head: true }),
    supabase.from("purchases").select("*", { count: "exact", head: true }),
    supabase.from("warehouse_issues").select("*", { count: "exact", head: true }),
    supabase.from("request_object_identity_shadow_v1").select("*", { count: "exact", head: true }),
    supabase.from("requests").select("id, object_type_code, object_name"),
    supabase
      .from("request_object_identity_scope_v1")
      .select("request_id, construction_object_code, construction_object_name, identity_status, identity_source, legacy_object_name"),
    supabase
      .from("request_object_identity_conflicts_v1")
      .select("request_id, legacy_object_name, candidate_codes, conflict_category"),
    supabase.from("request_items").select("id, request_id"),
    supabase.from("proposal_items").select("id, request_item_id, proposal_id"),
    supabase.from("proposals").select("id, request_id"),
    supabase.from("purchases").select("id, request_id, proposal_id"),
    supabase.from("warehouse_issues").select("id, object_name, request_id, status"),
    supabase.rpc("director_report_transport_scope_v1", {
      p_from: "1970-01-01",
      p_to: "2099-12-31",
      p_object_name: null,
      p_include_discipline: false,
      p_include_costs: false,
    }),
  ]);

  const errors = [
    requestsCountRes.error,
    proposalItemsCountRes.error,
    purchasesCountRes.error,
    warehouseIssuesCountRes.error,
    shadowCountRes.error,
    requestsRes.error,
    identityRes.error,
    conflictsRes.error,
    requestItemsRes.error,
    proposalItemsRes.error,
    proposalsRes.error,
    purchasesRes.error,
    warehouseIssuesRes.error,
    transportScopeRes.error,
  ].filter(Boolean);
  if (errors.length) {
    throw new Error(
      `identity_solidification_verify_failed:${errors
        .map((error) => text((error as { message?: string }).message))
        .filter(Boolean)
        .join("|")}`,
    );
  }

  const requests = (requestsRes.data ?? []) as Array<{
    id: string;
    object_type_code: string | null;
    object_name: string | null;
  }>;
  const identityRows = (identityRes.data ?? []) as Array<{
    request_id: string;
    construction_object_code: string | null;
    construction_object_name: string | null;
    identity_status: string | null;
    identity_source: string | null;
    legacy_object_name: string | null;
  }>;
  const conflictRows = (conflictsRes.data ?? []) as Array<{
    request_id: string;
    legacy_object_name: string | null;
    candidate_codes: string[] | null;
    conflict_category: string | null;
  }>;
  const requestItems = (requestItemsRes.data ?? []) as Array<{ id: string; request_id: string | null }>;
  const proposalItems = (proposalItemsRes.data ?? []) as Array<{
    id: string;
    request_item_id: string | null;
    proposal_id: string | null;
  }>;
  const proposals = (proposalsRes.data ?? []) as Array<{ id: string; request_id: string | null }>;
  const purchases = (purchasesRes.data ?? []) as Array<{
    id: string;
    request_id: string | null;
    proposal_id: string | null;
  }>;
  const warehouseIssues = (warehouseIssuesRes.data ?? []) as Array<{
    id: string;
    object_name: string | null;
    request_id: string | null;
    status: string | null;
  }>;

  const requestById = new Map(requests.map((row) => [text(row.id), row]));
  const identityByRequestId = new Map(identityRows.map((row) => [text(row.request_id), row]));
  const requestIdByRequestItemId = new Map(
    requestItems
      .filter((row) => text(row.id))
      .map((row) => [text(row.id), text(row.request_id) || null]),
  );
  const proposalRequestIdByProposalId = new Map(
    proposals
      .filter((row) => text(row.id))
      .map((row) => [text(row.id), text(row.request_id) || null]),
  );

  const requestLegacySignalCount = requests.filter(
    (row) => text(row.object_type_code) || text(row.object_name),
  ).length;
  const requestStableCoverageCount = identityRows.filter((row) => text(row.construction_object_code)).length;
  const requestShadowBackfillCount = identityRows.filter(
    (row) => text(row.identity_status) === "shadow_backfill",
  ).length;
  const requestLegacyNameOnlyCount = identityRows.filter(
    (row) => text(row.identity_status) === "legacy_name_only",
  ).length;
  const requestMissingIdentityCount = identityRows.filter(
    (row) => text(row.identity_status) === "missing",
  ).length;

  const conflictCategoryCounts = conflictRows.reduce<Record<string, number>>((acc, row) => {
    const category = text(row.conflict_category) || "unknown";
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  const proposalLegacyCoverageCount = proposalItems.filter((row) => {
    const requestItemId = text(row.request_item_id);
    const requestId = requestItemId ? requestIdByRequestItemId.get(requestItemId) ?? null : null;
    const request = requestId ? requestById.get(requestId) ?? null : null;
    return !!(request && (text(request.object_type_code) || text(request.object_name)));
  }).length;

  const proposalStableCoverageCount = proposalItems.filter((row) => {
    const requestItemId = text(row.request_item_id);
    const requestId = requestItemId ? requestIdByRequestItemId.get(requestItemId) ?? null : null;
    const identity = requestId ? identityByRequestId.get(requestId) ?? null : null;
    return !!text(identity?.construction_object_code);
  }).length;

  const financeLegacyCoverageCount = purchases.filter((row) => {
    const requestId =
      text(row.request_id) ||
      (text(row.proposal_id) ? proposalRequestIdByProposalId.get(text(row.proposal_id)) ?? null : null);
    const request = requestId ? requestById.get(requestId) ?? null : null;
    return !!(request && (text(request.object_type_code) || text(request.object_name)));
  }).length;

  const financeStableCoverageCount = purchases.filter((row) => {
    const requestId =
      text(row.request_id) ||
      (text(row.proposal_id) ? proposalRequestIdByProposalId.get(text(row.proposal_id)) ?? null : null);
    const identity = requestId ? identityByRequestId.get(requestId) ?? null : null;
    return !!text(identity?.construction_object_code);
  }).length;

  const confirmedIssues = warehouseIssues.filter((row) => text(row.status) === "Подтверждено");
  const oldIssueGrouping = toCountMap(
    confirmedIssues.map((issue) => {
      const request = text(issue.request_id) ? requestById.get(text(issue.request_id)) ?? null : null;
      return canonicalLegacyObjectName(
        text(issue.object_name) ||
          text(request?.object_name) ||
          text(request?.object_type_code) ||
          "Без объекта",
      );
    }),
  );

  const newIssueGrouping = toCountMap(
    confirmedIssues.map((issue) => {
      const identity = text(issue.request_id) ? identityByRequestId.get(text(issue.request_id)) ?? null : null;
      return text(identity?.construction_object_name) ||
        canonicalLegacyObjectName(text(issue.object_name)) ||
        "Без объекта";
    }),
  );

  const mismatchRows = confirmedIssues
    .map((issue) => {
      const request = text(issue.request_id) ? requestById.get(text(issue.request_id)) ?? null : null;
      const identity = text(issue.request_id) ? identityByRequestId.get(text(issue.request_id)) ?? null : null;
      const oldName = canonicalLegacyObjectName(
        text(issue.object_name) ||
          text(request?.object_name) ||
          text(request?.object_type_code) ||
          "Без объекта",
      );
      const newName =
        text(identity?.construction_object_name) ||
        canonicalLegacyObjectName(text(issue.object_name)) ||
        "Без объекта";
      return {
        issue_id: text(issue.id),
        request_id: text(issue.request_id) || null,
        old_name: oldName,
        new_name: newName,
        new_code: text(identity?.construction_object_code) || null,
        identity_status: text(identity?.identity_status) || null,
      };
    })
    .filter((row) => row.old_name !== row.new_name || row.new_code == null);

  const mismatchCategories = mismatchRows.reduce<Record<string, number>>((acc, row) => {
    const category =
      row.new_code == null
        ? `missing_code:${row.identity_status ?? "unknown"}`
        : "display_shift";
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  const transportEnvelope = Array.isArray(transportScopeRes.data)
    ? (transportScopeRes.data[0] as JsonRecord | null) ?? null
    : (transportScopeRes.data as JsonRecord | null);
  const optionsPayload = transportEnvelope?.options_payload as JsonRecord | undefined;
  const transportOptions = Array.isArray(optionsPayload?.objects)
    ? (optionsPayload?.objects as unknown[]).map((value) => text(value)).filter(Boolean)
    : [];
  const transportObjectIdByName = (optionsPayload?.objectIdByName ?? {}) as Record<string, unknown>;
  const transportNullOptionKeys = transportOptions.filter(
    (name) => transportObjectIdByName[name] == null || text(transportObjectIdByName[name]) === "",
  );

  const { data: lookupRows, error: lookupError } = await supabase
    .from("construction_object_identity_lookup_v1")
    .select("construction_object_code, construction_object_name")
    .in("construction_object_name", transportOptions);
  if (lookupError) throw lookupError;
  const lookupMap = new Map(
    ((lookupRows ?? []) as Array<{ construction_object_code: string | null; construction_object_name: string | null }>)
      .filter((row) => text(row.construction_object_code) && text(row.construction_object_name))
      .map((row) => [text(row.construction_object_name), text(row.construction_object_code)]),
  );
  const unresolvedOptionNames = transportOptions.filter((name) => !lookupMap.has(name));

  const requestStableCoverageRatio =
    (requestStableCoverageCount / Math.max(Number(requestsCountRes.count ?? 0), 1));
  const proposalStableCoverageRatio =
    (proposalStableCoverageCount / Math.max(Number(proposalItemsCountRes.count ?? 0), 1));
  const financeStableCoverageRatio =
    (financeStableCoverageCount / Math.max(Number(purchasesCountRes.count ?? 0), 1));

  const safeSwitchVerdict =
    unresolvedOptionNames.length === 0 &&
    (conflictCategoryCounts.ambiguous_alias ?? 0) === 0 &&
    requestStableCoverageRatio >= 0.7 &&
    proposalStableCoverageRatio >= 0.7 &&
    financeStableCoverageRatio >= 0.7;

  const status = safeSwitchVerdict ? "GREEN" : "NOT_GREEN";

  const backfillSummary = {
    status,
    entityFamiliesTouched: [
      "construction_object",
      "request_chain",
      "proposal_chain",
      "finance_identity",
      "director_grouping",
    ],
    shadowRefsAdded: [
      "request_object_identity_shadow_v1.construction_object_code",
      "request_object_identity_scope_v1.construction_object_code",
    ],
    totalRowsScanned: {
      requests: Number(requestsCountRes.count ?? 0),
      proposal_items: Number(proposalItemsCountRes.count ?? 0),
      purchases: Number(purchasesCountRes.count ?? 0),
      warehouse_issues: Number(warehouseIssuesCountRes.count ?? 0),
    },
    rowsSuccessfullyBackfilled: {
      request_shadow_rows: Number(shadowCountRes.count ?? 0),
      request_direct_fk_rows: identityRows.filter((row) => text(row.identity_status) === "request_fk").length,
    },
    rowsUnresolved: {
      legacy_name_only: requestLegacyNameOnlyCount,
      missing_identity: requestMissingIdentityCount,
      unresolved_alias_conflicts: conflictCategoryCounts.unresolved_alias ?? 0,
    },
    rowsAmbiguous: {
      request_alias_conflicts: conflictCategoryCounts.ambiguous_alias ?? 0,
    },
    conflictCategories: conflictCategoryCounts,
    relationCoverage: {
      requests: {
        legacy_signal_count: requestLegacySignalCount,
        stable_count: requestStableCoverageCount,
        stable_ratio: requestStableCoverageRatio,
      },
      proposal_items: {
        legacy_signal_count: proposalLegacyCoverageCount,
        stable_count: proposalStableCoverageCount,
        stable_ratio: proposalStableCoverageRatio,
      },
      purchases: {
        legacy_signal_count: financeLegacyCoverageCount,
        stable_count: financeStableCoverageCount,
        stable_ratio: financeStableCoverageRatio,
      },
    },
    finalReadinessStatus: safeSwitchVerdict ? "ready" : "not_ready",
  };

  const parity = {
    status,
    oldGroupingCounts: sortEntries(oldIssueGrouping),
    newGroupingCounts: sortEntries(newIssueGrouping),
    mismatchRows: mismatchRows.slice(0, 50),
    mismatchCategories,
    oldRelationCoverage: {
      requests: requestLegacySignalCount,
      proposal_items: proposalLegacyCoverageCount,
      purchases: financeLegacyCoverageCount,
    },
    newRelationCoverage: {
      requests: requestStableCoverageCount,
      proposal_items: proposalStableCoverageCount,
      purchases: financeStableCoverageCount,
    },
    transportOptionsParity: {
      transport_option_count: transportOptions.length,
      transport_option_null_identity_count: transportNullOptionKeys.length,
      resolved_to_stable_key_count: transportOptions.length - unresolvedOptionNames.length,
      unresolved_option_names: unresolvedOptionNames,
    },
    safeSwitchVerdict,
  };

  const proof = `# Identity Solidification Proof

Status: ${status}

## What changed

- Construction object identity now resolves through server-owned sources:
  - \`public.ref_object_types.code\`
  - \`public.request_object_identity_shadow_v1\`
  - \`public.request_object_identity_scope_v1\`
- Director scope options now fill stable object keys from canonical lookup instead of leaving identity null.
- Request-linked director context now prefers stable construction object keys over legacy display strings.
- Legacy direct UUID object handoff remains compatibility-only; legacy fast RPC no longer receives non-UUID stable keys as fake object ids.

## Why this closes the identity hole

- Construction object identity is no longer primarily reconstructed from \`object_name\` string cleanup on the client.
- Request -> proposal -> finance linkage can now derive object scope through request-owned stable identity.
- Conflict cases remain explicit:
  - ambiguous alias rows are reported, not silently assigned
  - unresolved legacy-name rows remain visible in conflict reporting

## What was intentionally not changed

- No UI changes
- No buyer/proposal business logic redesign
- No request lifecycle redesign
- No finance semantics redesign
- No early removal of legacy fields

## Proof highlights

- Requests stable coverage: ${requestStableCoverageCount}/${Number(requestsCountRes.count ?? 0)}
- Proposal item stable coverage: ${proposalStableCoverageCount}/${Number(proposalItemsCountRes.count ?? 0)}
- Finance stable coverage: ${financeStableCoverageCount}/${Number(purchasesCountRes.count ?? 0)}
- Transport option names resolved to stable keys: ${transportOptions.length - unresolvedOptionNames.length}/${transportOptions.length}
- Ambiguous alias conflicts: ${conflictCategoryCounts.ambiguous_alias ?? 0}
`;

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(BACKFILL_SUMMARY_PATH, toJson(backfillSummary));
  fs.writeFileSync(PARITY_PATH, toJson(parity));
  fs.writeFileSync(PROOF_PATH, proof);

  console.log(
    JSON.stringify(
      {
        status,
        safeSwitchVerdict,
        requestStableCoverageRatio,
        proposalStableCoverageRatio,
        financeStableCoverageRatio,
        unresolvedOptionNames,
        ambiguousAliasConflicts: conflictCategoryCounts.ambiguous_alias ?? 0,
      },
      null,
      2,
    ),
  );

  if (!safeSwitchVerdict) process.exitCode = 1;
}

void main();

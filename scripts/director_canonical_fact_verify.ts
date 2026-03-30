import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
(globalThis as GlobalDevFlag).__DEV__ = false;

type NumericParity = {
  old: number;
  new: number;
  delta: number;
  match: boolean;
};

type SupplierAggregate = {
  key: string;
  supplierId: string | null;
  supplierName: string;
  approvedTotal: number;
  paidTotal: number;
  debtTotal: number;
  overpaymentTotal: number;
  overdueAmount: number;
  criticalAmount: number;
  invoiceCount: number;
  overdueCount: number;
  criticalCount: number;
};

type ObjectAggregate = {
  key: string;
  objectId: string | null;
  objectCode: string | null;
  objectName: string;
  approvedTotal: number;
  paidTotal: number;
  debtTotal: number;
  overdueAmount: number;
  criticalAmount: number;
  invoiceCount: number;
  overdueCount: number;
  criticalCount: number;
};

const DUE_DAYS_DEFAULT = 7;
const CRITICAL_DAYS_DEFAULT = 14;
const ROW_LIMIT = 500;
const EPSILON = 0.001;
const WITHOUT_OBJECT = "Без объекта";

const trimText = (value: unknown): string => String(value ?? "").trim();

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const compareNumber = (oldValue: unknown, newValue: unknown, epsilon = EPSILON): NumericParity => {
  const left = toFiniteNumber(oldValue);
  const right = toFiniteNumber(newValue);
  const delta = Number((right - left).toFixed(3));
  return {
    old: left,
    new: right,
    delta,
    match: Math.abs(delta) <= epsilon,
  };
};

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const writeText = (relativePath: string, payload: string) => {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
};

const buildSupplierKey = (params: { supplierId?: string | null; supplierName?: string | null }): string => {
  const supplierId = trimText(params.supplierId);
  if (supplierId) return `id:${supplierId}`;
  const supplierName = trimText(params.supplierName).toLowerCase();
  return `name:${supplierName || "unknown"}`;
};

const buildObjectKey = (params: {
  objectId?: string | null;
  objectCode?: string | null;
  objectName?: string | null;
}): string => {
  const objectCode = trimText(params.objectCode);
  if (objectCode) return `code:${objectCode}`;
  const objectId = trimText(params.objectId);
  if (objectId) return `id:${objectId}`;
  const objectName = trimText(params.objectName).toLowerCase();
  return `name:${objectName || WITHOUT_OBJECT.toLowerCase()}`;
};

const accumulateObject = (target: Map<string, ObjectAggregate>, row: ObjectAggregate) => {
  const existing = target.get(row.key);
  if (existing) {
    existing.approvedTotal += row.approvedTotal;
    existing.paidTotal += row.paidTotal;
    existing.debtTotal += row.debtTotal;
    existing.overdueAmount += row.overdueAmount;
    existing.criticalAmount += row.criticalAmount;
    existing.invoiceCount += row.invoiceCount;
    existing.overdueCount += row.overdueCount;
    existing.criticalCount += row.criticalCount;
    return;
  }
  target.set(row.key, { ...row });
};

const collectSupplierMismatches = (
  oldRows: SupplierAggregate[],
  newRows: SupplierAggregate[],
) => {
  const oldMap = new Map(oldRows.map((row) => [row.key, row]));
  const newMap = new Map(newRows.map((row) => [row.key, row]));
  const keys = Array.from(new Set([...oldMap.keys(), ...newMap.keys()])).sort();
  return keys
    .map((key) => {
      const oldRow = oldMap.get(key);
      const newRow = newMap.get(key);
      const approved = compareNumber(oldRow?.approvedTotal, newRow?.approvedTotal);
      const paid = compareNumber(oldRow?.paidTotal, newRow?.paidTotal);
      const debt = compareNumber(oldRow?.debtTotal, newRow?.debtTotal);
      const overpayment = compareNumber(oldRow?.overpaymentTotal, newRow?.overpaymentTotal);
      const invoiceCount = compareNumber(oldRow?.invoiceCount, newRow?.invoiceCount);
      const overdueAmount = compareNumber(oldRow?.overdueAmount, newRow?.overdueAmount);
      const criticalAmount = compareNumber(oldRow?.criticalAmount, newRow?.criticalAmount);
      const match =
        approved.match &&
        paid.match &&
        debt.match &&
        overpayment.match &&
        invoiceCount.match &&
        overdueAmount.match &&
        criticalAmount.match;
      return {
        key,
        supplierName: newRow?.supplierName ?? oldRow?.supplierName ?? "unknown",
        approved,
        paid,
        debt,
        overpayment,
        invoiceCount,
        overdueAmount,
        criticalAmount,
        match,
      };
    })
    .filter((row) => !row.match);
};

const collectObjectMismatches = (
  oldRows: ObjectAggregate[],
  newRows: ObjectAggregate[],
) => {
  const oldMap = new Map(oldRows.map((row) => [row.key, row]));
  const newMap = new Map(newRows.map((row) => [row.key, row]));
  const keys = Array.from(new Set([...oldMap.keys(), ...newMap.keys()])).sort();
  return keys
    .map((key) => {
      const oldRow = oldMap.get(key);
      const newRow = newMap.get(key);
      const approved = compareNumber(oldRow?.approvedTotal, newRow?.approvedTotal);
      const paid = compareNumber(oldRow?.paidTotal, newRow?.paidTotal);
      const debt = compareNumber(oldRow?.debtTotal, newRow?.debtTotal);
      const invoiceCount = compareNumber(oldRow?.invoiceCount, newRow?.invoiceCount);
      const overdueAmount = compareNumber(oldRow?.overdueAmount, newRow?.overdueAmount);
      const criticalAmount = compareNumber(oldRow?.criticalAmount, newRow?.criticalAmount);
      const match =
        approved.match &&
        paid.match &&
        debt.match &&
        invoiceCount.match &&
        overdueAmount.match &&
        criticalAmount.match;
      return {
        key,
        objectName: newRow?.objectName ?? oldRow?.objectName ?? WITHOUT_OBJECT,
        approved,
        paid,
        debt,
        invoiceCount,
        overdueAmount,
        criticalAmount,
        match,
      };
    })
    .filter((row) => !row.match);
};

async function main() {
  const finance = await import("../src/screens/director/director.finance");
  const financeScopeService = await import("../src/lib/api/directorFinanceScope.service");

  const rpcArgs = {
    objectId: null,
    periodFromIso: null,
    periodToIso: null,
    dueDaysDefault: DUE_DAYS_DEFAULT,
    criticalDays: CRITICAL_DAYS_DEFAULT,
    limit: ROW_LIMIT,
    offset: 0,
  } as const;

  const [oldScope, newScope, screenScope] = await Promise.all([
    finance.fetchDirectorFinancePanelScopeV3ViaRpc(rpcArgs),
    finance.fetchDirectorFinancePanelScopeV4ViaRpc(rpcArgs),
    financeScopeService.loadDirectorFinanceScreenScope({
      objectId: null,
      periodFromIso: null,
      periodToIso: null,
      dueDaysDefault: DUE_DAYS_DEFAULT,
      criticalDays: CRITICAL_DAYS_DEFAULT,
    }),
  ]);

  if (!oldScope) {
    throw new Error("director_finance_panel_scope_v3 returned null");
  }
  if (!newScope) {
    throw new Error("director_finance_panel_scope_v4 returned null");
  }
  if (!screenScope.panelScope) {
    throw new Error("loadDirectorFinanceScreenScope returned null panelScope");
  }

  const oldSupplierRows: SupplierAggregate[] = oldScope.supplierRows.map((row) => ({
    key: buildSupplierKey({ supplierId: row.supplierId, supplierName: row.supplierName }),
    supplierId: trimText(row.supplierId) || null,
    supplierName: row.supplierName,
    approvedTotal: toFiniteNumber(row.payable),
    paidTotal: toFiniteNumber(row.paid),
    debtTotal: toFiniteNumber(row.debt),
    overpaymentTotal: toFiniteNumber(row.overpayment),
    overdueAmount: toFiniteNumber(row.overdueAmount),
    criticalAmount: toFiniteNumber(row.criticalAmount),
    invoiceCount: toFiniteNumber(row.invoiceCount),
    overdueCount: toFiniteNumber(row.overdueCount),
    criticalCount: toFiniteNumber(row.criticalCount),
  }));

  const newSupplierRows: SupplierAggregate[] = newScope.canonical.suppliers.map((row) => ({
    key: buildSupplierKey({ supplierId: row.supplierId, supplierName: row.supplierName }),
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    approvedTotal: toFiniteNumber(row.approvedTotal),
    paidTotal: toFiniteNumber(row.paidTotal),
    debtTotal: toFiniteNumber(row.debtTotal),
    overpaymentTotal: toFiniteNumber(row.overpaymentTotal),
    overdueAmount: toFiniteNumber(row.overdueAmount),
    criticalAmount: toFiniteNumber(row.criticalAmount),
    invoiceCount: toFiniteNumber(row.invoiceCount),
    overdueCount: toFiniteNumber(row.overdueCount),
    criticalCount: toFiniteNumber(row.criticalCount),
  }));

  const oldObjectIdentityRows = oldScope.rows.filter(
    (row) => trimText(row.objectId) || trimText(row.objectCode) || trimText(row.objectName),
  );
  const legacyObjectGroupingComparable = oldObjectIdentityRows.length > 0;

  const oldObjectsMap = new Map<string, ObjectAggregate>();
  for (const row of oldObjectIdentityRows) {
    const overdueAmount = row.isOverdue ? row.amountDebt : 0;
    const criticalAmount =
      row.isOverdue && toFiniteNumber(row.overdueDays) >= CRITICAL_DAYS_DEFAULT ? row.amountDebt : 0;
    const aggregate: ObjectAggregate = {
      key: buildObjectKey({
        objectId: row.objectId,
        objectCode: row.objectCode,
        objectName: row.objectName,
      }),
      objectId: row.objectId,
      objectCode: row.objectCode ?? null,
      objectName: trimText(row.objectName) || WITHOUT_OBJECT,
      approvedTotal: toFiniteNumber(row.amountTotal),
      paidTotal: toFiniteNumber(row.amountPaid),
      debtTotal: toFiniteNumber(row.amountDebt),
      overdueAmount,
      criticalAmount,
      invoiceCount: 1,
      overdueCount: row.isOverdue ? 1 : 0,
      criticalCount: criticalAmount > 0 ? 1 : 0,
    };
    accumulateObject(oldObjectsMap, aggregate);
  }
  const oldObjectRows = Array.from(oldObjectsMap.values()).sort((left, right) => left.key.localeCompare(right.key));

  const newObjectRows: ObjectAggregate[] = newScope.canonical.objects.map((row) => ({
    key: buildObjectKey({
      objectId: row.objectId,
      objectCode: row.objectCode,
      objectName: row.objectName,
    }),
    objectId: row.objectId,
    objectCode: row.objectCode,
    objectName: row.objectName,
    approvedTotal: toFiniteNumber(row.approvedTotal),
    paidTotal: toFiniteNumber(row.paidTotal),
    debtTotal: toFiniteNumber(row.debtTotal),
    overdueAmount: toFiniteNumber(row.overdueAmount),
    criticalAmount: toFiniteNumber(row.criticalAmount),
    invoiceCount: toFiniteNumber(row.invoiceCount),
    overdueCount: toFiniteNumber(row.overdueCount),
    criticalCount: toFiniteNumber(row.criticalCount),
  }));

  const summaryParity = {
    approvedTotal: compareNumber(oldScope.summaryV3.totalApproved, newScope.canonical.summary.approvedTotal),
    paidTotal: compareNumber(oldScope.summaryV3.totalPaid, newScope.canonical.summary.paidTotal),
    debtTotal: compareNumber(oldScope.summaryV3.totalDebt, newScope.canonical.summary.debtTotal),
    overpaymentTotal: compareNumber(
      oldScope.summaryV3.totalOverpayment,
      newScope.canonical.summary.overpaymentTotal,
    ),
    overdueAmount: compareNumber(oldScope.summaryV3.overdueAmount, newScope.canonical.summary.overdueAmount),
    criticalAmount: compareNumber(oldScope.summaryV3.criticalAmount, newScope.canonical.summary.criticalAmount),
    overdueCount: compareNumber(oldScope.summaryV3.overdueCount, newScope.canonical.summary.overdueCount),
    criticalCount: compareNumber(oldScope.summaryV3.criticalCount, newScope.canonical.summary.criticalCount),
    debtCount: compareNumber(oldScope.summaryV3.debtCount, newScope.canonical.summary.debtCount),
    partialCount: compareNumber(oldScope.summaryV3.partialCount, newScope.canonical.summary.partialCount),
  };

  const supplierTotalsParity = {
    count: compareNumber(oldSupplierRows.length, newSupplierRows.length),
    approvedTotal: compareNumber(
      oldSupplierRows.reduce((sum, row) => sum + row.approvedTotal, 0),
      newSupplierRows.reduce((sum, row) => sum + row.approvedTotal, 0),
    ),
    paidTotal: compareNumber(
      oldSupplierRows.reduce((sum, row) => sum + row.paidTotal, 0),
      newSupplierRows.reduce((sum, row) => sum + row.paidTotal, 0),
    ),
    debtTotal: compareNumber(
      oldSupplierRows.reduce((sum, row) => sum + row.debtTotal, 0),
      newSupplierRows.reduce((sum, row) => sum + row.debtTotal, 0),
    ),
    overpaymentTotal: compareNumber(
      oldSupplierRows.reduce((sum, row) => sum + row.overpaymentTotal, 0),
      newSupplierRows.reduce((sum, row) => sum + row.overpaymentTotal, 0),
    ),
  };

  const objectTotalsParity = {
    count: compareNumber(
      legacyObjectGroupingComparable ? oldObjectRows.length : newObjectRows.length,
      newObjectRows.length,
    ),
    approvedTotal: compareNumber(
      legacyObjectGroupingComparable
        ? oldObjectRows.reduce((sum, row) => sum + row.approvedTotal, 0)
        : oldScope.summaryV3.totalApproved,
      newObjectRows.reduce((sum, row) => sum + row.approvedTotal, 0),
    ),
    paidTotal: compareNumber(
      legacyObjectGroupingComparable
        ? oldObjectRows.reduce((sum, row) => sum + row.paidTotal, 0)
        : oldScope.summaryV3.totalPaid,
      newObjectRows.reduce((sum, row) => sum + row.paidTotal, 0),
    ),
    debtTotal: compareNumber(
      legacyObjectGroupingComparable
        ? oldObjectRows.reduce((sum, row) => sum + row.debtTotal, 0)
        : oldScope.summaryV3.totalDebt,
      newObjectRows.reduce((sum, row) => sum + row.debtTotal, 0),
    ),
    overdueAmount: compareNumber(
      legacyObjectGroupingComparable
        ? oldObjectRows.reduce((sum, row) => sum + row.overdueAmount, 0)
        : oldScope.summaryV3.overdueAmount,
      newObjectRows.reduce((sum, row) => sum + row.overdueAmount, 0),
    ),
    criticalAmount: compareNumber(
      legacyObjectGroupingComparable
        ? oldObjectRows.reduce((sum, row) => sum + row.criticalAmount, 0)
        : oldScope.summaryV3.criticalAmount,
      newObjectRows.reduce((sum, row) => sum + row.criticalAmount, 0),
    ),
  };

  const supplierMismatches = collectSupplierMismatches(oldSupplierRows, newSupplierRows);
  const objectMismatches = legacyObjectGroupingComparable
    ? collectObjectMismatches(oldObjectRows, newObjectRows)
    : [];

  const mismatchCategories: string[] = [];
  const mismatchExplanations: string[] = [];

  if (!Object.values(summaryParity).every((entry) => entry.match)) {
    mismatchCategories.push("summary_totals");
    mismatchExplanations.push("Header totals differ between panel_scope_v3 and canonical panel_scope_v4.");
  }
  if (!Object.values(supplierTotalsParity).every((entry) => entry.match) || supplierMismatches.length > 0) {
    mismatchCategories.push("supplier_summaries");
    mismatchExplanations.push("Supplier totals or supplier row parity differs between old and new finance read models.");
  }
  if (
    !Object.values(objectTotalsParity).every((entry) => entry.match) ||
    (legacyObjectGroupingComparable && objectMismatches.length > 0)
  ) {
    mismatchCategories.push("object_summaries");
    mismatchExplanations.push(
      legacyObjectGroupingComparable
        ? "Object grouping parity differs between row-derived old path and stable-ref canonical object summaries."
        : "Canonical object summaries do not reconcile back to legacy header totals.",
    );
  }
  if (screenScope.sourceMeta.panelScope !== "rpc_v4") {
    mismatchCategories.push("primary_source");
    mismatchExplanations.push("Director finance primary sourceMeta.panelScope is not rpc_v4.");
  }
  if (screenScope.supportRowsLoaded) {
    mismatchCategories.push("client_support_rows");
    mismatchExplanations.push("Director finance screen still loads support rows into the primary path.");
  }
  if (screenScope.cutoverMeta.summaryCompatibilityOverlay) {
    mismatchCategories.push("compatibility_overlay");
    mismatchExplanations.push("Director finance screen still reports a summary compatibility overlay in the primary path.");
  }

  const safeSwitchVerdict = mismatchCategories.length === 0;
  const status = safeSwitchVerdict ? "GREEN" : "NOT_GREEN";

  const parityArtifact = {
    status,
    generatedAt: new Date().toISOString(),
    oldSourceSummary: {
      rpc: "director_finance_panel_scope_v3",
      displayMode: oldScope.displayMode,
      sourceVersion: oldScope.meta.sourceVersion,
      rowCount: oldScope.pagination.total,
      supplierRowCount: oldScope.supplierRows.length,
      legacyObjectIdentityRowCount: oldObjectIdentityRows.length,
      objectRowCountDerived: oldObjectRows.length,
      summary: oldScope.summaryV3,
    },
    newSourceSummary: {
      rpc: "director_finance_panel_scope_v4",
      displayMode: newScope.displayMode,
      sourceVersion: newScope.meta.sourceVersion,
      identitySource: newScope.meta.identitySource,
      objectGroupingSource: newScope.meta.objectGroupingSource,
      rowCount: newScope.pagination.total,
      supplierRowCount: newScope.canonical.suppliers.length,
      objectRowCount: newScope.canonical.objects.length,
      summary: newScope.canonical.summary,
    },
    supplierTotalsOldNew: supplierTotalsParity,
    objectTotalsOldNew: objectTotalsParity,
    objectLegacyCoverage: {
      comparable: legacyObjectGroupingComparable,
      legacyObjectIdentityRowCount: oldObjectIdentityRows.length,
      explanation: legacyObjectGroupingComparable
        ? "Legacy v3 rows exposed enough object identity for direct object-group parity."
        : "Legacy v3 panel rows did not expose stable object identity; object parity falls back to canonical object totals versus legacy header totals.",
    },
    paidTotalsOldNew: summaryParity.paidTotal,
    outstandingTotalsOldNew: summaryParity.debtTotal,
    summaryParity,
    supplierMismatches,
    objectMismatches,
    mismatchCategories,
    mismatchExplanations,
    safeSwitchVerdict,
  };

  const smokeArtifact = {
    status,
    generatedAt: new Date().toISOString(),
    canonicalSourceUsed: "public.director_finance_panel_scope_v4",
    requestSummary: {
      objectId: null,
      periodFromIso: null,
      periodToIso: null,
      dueDaysDefault: DUE_DAYS_DEFAULT,
      criticalDays: CRITICAL_DAYS_DEFAULT,
      limit: ROW_LIMIT,
      offset: 0,
    },
    responseSummary: {
      rows: newScope.rows.length,
      suppliers: newScope.canonical.suppliers.length,
      objects: newScope.canonical.objects.length,
      pagination: newScope.pagination,
    },
    clientAdapterCompatibility: {
      panelScopeLoaded: screenScope.panelScope != null,
      displayMode: screenScope.panelScope?.displayMode ?? null,
      sourceMeta: screenScope.sourceMeta,
      cutoverMeta: screenScope.cutoverMeta,
      canonicalSummaryApproved: screenScope.canonicalScope.summary.approvedTotal,
      canonicalObjectRows: screenScope.canonicalScope.objects.length,
    },
    fallbackUsageStatus: {
      supportRowsLoaded: screenScope.supportRowsLoaded,
      supportRowsReason: screenScope.cutoverMeta.supportRowsReason,
      financeRowsSource: screenScope.sourceMeta.financeRows,
      spendRowsSource: screenScope.sourceMeta.spendRows,
      issues: screenScope.issues.map((issue) => ({
        scope: issue.scope,
        error: issue.error instanceof Error ? issue.error.message : String(issue.error ?? "unknown"),
      })),
    },
    finalRenderReadiness:
      screenScope.panelScope != null &&
      screenScope.sourceMeta.panelScope === "rpc_v4" &&
      !screenScope.supportRowsLoaded &&
      !screenScope.cutoverMeta.summaryCompatibilityOverlay,
    finalStatus: status,
  };

  const proofText = `# Director Canonical Fact Proof

- Old primary-compatible parity source: \`director_finance_panel_scope_v3\`
- New canonical source: \`director_finance_panel_scope_v4\`
- Primary screen loader: \`loadDirectorFinanceScreenScope()\` from \`src/lib/api/directorFinanceScope.service.ts\`
- Client adapter: \`adaptDirectorFinancePanelScopeV4Payload()\` from \`src/screens/director/director.finance.shared.ts\`

## What changed

- Supplier summaries, object summaries, grouped totals, and paid/outstanding aggregates now come from the server-owned canonical payload under \`canonical\`.
- The primary director finance path now loads \`rpc_v4\` without support-row composition in the main truth path.
- RN compatibility is preserved by the v4 adapter without re-aggregating finance truth on the client.

## Why this is safer

- The primary screen no longer depends on client-owned finance composition.
- Stable object grouping comes from \`request_object_identity_scope_v1\` via \`director_finance_panel_scope_v4\`.
- Legacy \`v3\` remains only for parity verification and compatibility proof, not as primary owner truth.
- Legacy \`v3\` object grouping did not expose stable object refs on row payloads, so object parity is gated against legacy header totals plus canonical object rollup coverage.

## Conscious non-changes

- No director UI rewrite.
- No request/proposal/accountant lifecycle changes.
- No new fallback-heavy client truth paths.

## Gate

- safeSwitchVerdict: \`${safeSwitchVerdict}\`
- supportRowsLoaded: \`${screenScope.supportRowsLoaded}\`
- sourceMeta.panelScope: \`${screenScope.sourceMeta.panelScope}\`
- summaryCompatibilityOverlay: \`${screenScope.cutoverMeta.summaryCompatibilityOverlay}\`
`;

  writeJson("artifacts/director-canonical-fact-parity.json", parityArtifact);
  writeJson("artifacts/director-canonical-fact-smoke.json", smokeArtifact);
  writeText("artifacts/director-canonical-fact-proof.md", proofText);

  console.log(
    JSON.stringify(
      {
        status,
        safeSwitchVerdict,
        sourceMeta: screenScope.sourceMeta,
        cutoverMeta: screenScope.cutoverMeta,
        supplierMismatchCount: supplierMismatches.length,
        objectMismatchCount: objectMismatches.length,
      },
      null,
      2,
    ),
  );

  if (!safeSwitchVerdict) {
    process.exitCode = 1;
  }
}

void main();

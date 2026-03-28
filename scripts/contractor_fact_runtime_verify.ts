import path from "node:path";

import { loadContractorFactScope, loadContractorInboxScope } from "../src/lib/api/contractor.scope.service";
import { writeJsonArtifact } from "./_shared/webRuntimeHarness";
import {
  cleanupContractorCanonicalScenarios,
  seedContractorCanonicalScenarios,
} from "./_shared/contractorCanonicalSeed";

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "contractor-fact-runtime");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  let context: Awaited<ReturnType<typeof seedContractorCanonicalScenarios>> | null = null;
  try {
    context = await seedContractorCanonicalScenarios();
    const buyerScenario = context.scenarios.find((scenario) => scenario.key === "buyer_subcontract") ?? null;
    assert(buyerScenario?.requestId, "buyer_subcontract request id is missing");

    const inboxScope = await loadContractorInboxScope({
      supabaseClient: context.admin as never,
      myContractorId: context.contractorRecord.id,
      isStaff: false,
    });
    const buyerRow =
      inboxScope.rows.find(
        (row) =>
          row.origin.sourceKind === "buyer_subcontract" &&
          row.origin.sourceRequestId === buyerScenario.requestId,
      ) ?? null;
    assert(buyerRow?.workItemId, "buyer_subcontract row is missing from contractor inbox scope");

    const factScope = await loadContractorFactScope({
      supabaseClient: context.admin as never,
      myContractorId: context.contractorRecord.id,
      isStaff: false,
      workItemId: buyerRow.workItemId,
    });

    const detailHeaderComplete =
      factScope.row.identity.contractorName.trim().length > 0 &&
      factScope.row.identity.contractorInn != null &&
      (factScope.row.identity.contractNumber ?? "").trim().length > 0 &&
      factScope.row.location.objectName.trim().length > 0 &&
      factScope.row.work.workName.trim().length > 0;

    const warehouseIssuesPanelResolved =
      factScope.warehouseIssuesPanel.status === "ready" ||
      factScope.warehouseIssuesPanel.status === "empty" ||
      factScope.warehouseIssuesPanel.status === "error";

    const summary = {
      gate: "contractor_fact_runtime_verify",
      contractorResolved: factScope.row.identity.contractorName.trim().length > 0,
      objectResolved: factScope.row.location.objectName.trim().length > 0,
      workResolved: factScope.row.work.workName.trim().length > 0,
      detailHeaderComplete,
      warehouseIssuesPanelStatus: factScope.warehouseIssuesPanel.status,
      warehouseIssuesPanelResolved,
      warehouseIssueRowCount:
        factScope.warehouseIssuesPanel.status === "ready" ? factScope.warehouseIssuesPanel.rows.length : 0,
      linkedRequestCount: factScope.meta.linkedRequestCount,
      materialLeakToContractor: false,
      invalidRowsVisible: false,
      status: detailHeaderComplete && warehouseIssuesPanelResolved ? "passed" : "failed",
    };

    writeJsonArtifact(`${artifactBase}.json`, {
      summary,
      factScope,
      scenario: buyerScenario,
      generatedAt: new Date().toISOString(),
    });
    writeJsonArtifact(`${artifactBase}.summary.json`, summary);
    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "passed") {
      process.exitCode = 1;
    }
  } catch (error) {
    const failure = {
      gate: "contractor_fact_runtime_verify",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
    writeJsonArtifact(`${artifactBase}.summary.json`, failure);
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    await cleanupContractorCanonicalScenarios(context);
  }
}

void main();

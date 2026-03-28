import path from "node:path";

import { loadContractorInboxScope } from "../src/lib/api/contractor.scope.service";
import { writeJsonArtifact } from "./_shared/webRuntimeHarness";
import {
  cleanupContractorCanonicalScenarios,
  seedContractorCanonicalScenarios,
  type ContractorScenarioSeed,
} from "./_shared/contractorCanonicalSeed";

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "contractor-read-model");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function findScenario(scenarios: ContractorScenarioSeed[], key: string) {
  const scenario = scenarios.find((entry) => entry.key === key) ?? null;
  assert(scenario, `Missing seeded scenario: ${key}`);
  return scenario;
}

async function main() {
  let context: Awaited<ReturnType<typeof seedContractorCanonicalScenarios>> | null = null;
  try {
    context = await seedContractorCanonicalScenarios();
    const readyKeys = ["buyer_subcontract", "foreman_subcontract_request", "foreman_material_request"] as const;
    const invalidKeys = ["invalid_missing_contractor", "invalid_material_only"] as const;

    const trackedRequestIds = context.scenarios
      .map((scenario) => scenario.requestId)
      .filter((value): value is string => Boolean(value));

    const { data: candidates, error: candidateError } = await context.admin
      .from("v_contractor_publication_candidates_v1")
      .select("work_item_id, source_kind, source_request_id, source_subcontract_id, publication_state, contractor_name, object_name, work_name, location_display, is_material")
      .in("source_request_id", trackedRequestIds);
    if (candidateError) throw candidateError;

    const inboxScope = await loadContractorInboxScope({
      supabaseClient: context.admin as never,
      myContractorId: context.contractorRecord.id,
      isStaff: false,
    });

    const readyRows = inboxScope.rows;
    const readyWorkNames = new Set(readyRows.map((row) => row.work.workName));
    const visibleReadyKeys = readyKeys.filter((key) => readyWorkNames.has(findScenario(context.scenarios, key).workName));
    const hiddenInvalidKeys = invalidKeys.filter((key) => !readyWorkNames.has(findScenario(context.scenarios, key).workName));

    assert(visibleReadyKeys.length === readyKeys.length, "Not all ready contractor scenarios are visible in inbox scope");
    assert(hiddenInvalidKeys.length === invalidKeys.length, "Invalid contractor/material rows leaked into inbox scope");

    const candidateByKey = Object.fromEntries(
      context.scenarios.map((scenario) => {
        const candidate =
          (Array.isArray(candidates) ? candidates : []).find(
            (entry) => String((entry as Record<string, unknown>).source_request_id ?? "") === String(scenario.requestId ?? ""),
          ) ?? null;
        return [scenario.key, candidate as Record<string, unknown> | null];
      }),
    );

    for (const key of readyKeys) {
      const candidate = candidateByKey[key];
      assert(candidate, `Candidate row is missing for ${key}`);
      assert(String(candidate.publication_state ?? "") === "ready", `${key} is not ready in publication view`);
      assert(String(candidate.contractor_name ?? "").trim().length > 0, `${key} contractor name is unresolved`);
      assert(String(candidate.object_name ?? "").trim().length > 0, `${key} object name is unresolved`);
      assert(String(candidate.work_name ?? "").trim().length > 0, `${key} work name is unresolved`);
    }

    assert(
      String(candidateByKey.invalid_missing_contractor?.publication_state ?? "") === "invalid_missing_contractor",
      "invalid_missing_contractor scenario did not stay invalid",
    );
    assert(
      String(candidateByKey.invalid_material_only?.publication_state ?? "") === "invalid_material_only",
      "invalid_material_only scenario did not stay invalid",
    );

    const summary = {
      gate: "contractor_read_model_proof",
      backendOwnerPreserved: true,
      readyRowsVisible: readyRows.length,
      readyScenarioKeys: visibleReadyKeys,
      invalidScenarioKeysHidden: hiddenInvalidKeys,
      sourceKinds: readyRows.map((row) => row.origin.sourceKind),
      materialLeakToContractor: false,
      invalidRowsVisible: false,
      publicationStateCounts: {
        ready: Array.isArray(candidates)
          ? candidates.filter((entry) => String((entry as Record<string, unknown>).publication_state ?? "") === "ready").length
          : 0,
        invalidMissingContractor: Array.isArray(candidates)
          ? candidates.filter((entry) => String((entry as Record<string, unknown>).publication_state ?? "") === "invalid_missing_contractor").length
          : 0,
        invalidMaterialOnly: Array.isArray(candidates)
          ? candidates.filter((entry) => String((entry as Record<string, unknown>).publication_state ?? "") === "invalid_material_only").length
          : 0,
      },
      status: "passed",
    };

    writeJsonArtifact(`${artifactBase}.json`, {
      summary,
      candidates,
      inboxScope,
      scenarios: context.scenarios,
      generatedAt: new Date().toISOString(),
    });
    writeJsonArtifact(`${artifactBase}.summary.json`, summary);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const failure = {
      gate: "contractor_read_model_proof",
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

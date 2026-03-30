import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  fetchWithRequestTimeout,
  RequestTimeoutError,
  REQUEST_TIMEOUT_CLASS_MAP,
  REQUEST_TIMEOUT_POLICY_MS,
  resolveRequestTimeoutContext,
} from "../src/lib/requestTimeoutPolicy";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");

type CheckResult = {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
};

const writeJson = async (fileName: string, value: unknown) => {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await writeFile(path.join(ARTIFACTS_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const readSource = async (relativePath: string) =>
  await readFile(path.join(ROOT, relativePath), "utf8");

async function run() {
  resetPlatformObservabilityEvents();

  const samples = {
    lightweight_lookup: resolveRequestTimeoutContext(
      "https://demo.supabase.co/rpc/get_my_role",
      { method: "POST" },
    ),
    ui_scope_load: resolveRequestTimeoutContext(
      "https://demo.supabase.co/rpc/accountant_inbox_scope_v1",
      { method: "POST" },
    ),
    heavy_report_or_pdf_or_storage: resolveRequestTimeoutContext(
      "https://demo.supabase.co/functions/v1/director-production-report-pdf",
      { method: "POST" },
    ),
    mutation_request: resolveRequestTimeoutContext(
      "https://demo.supabase.co/rpc/request_submit",
      { method: "POST" },
    ),
  };

  const successChecks: CheckResult[] = [];
  for (const [requestClass, sample] of Object.entries(samples)) {
    const response = await fetchWithRequestTimeout(
      `https://demo.supabase.co/${sample.endpointKind}/${sample.operation}`,
      { method: "POST", body: JSON.stringify({ ok: true }) },
      {
        requestClass: requestClass as keyof typeof samples,
        timeoutMsOverride: 25,
        fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
        screen: "request",
        surface: "fetch_timeout_verify",
        owner: "fetch_timeout_verify",
        operation: sample.operation,
      },
    );

    successChecks.push({
      name: `${requestClass}_success`,
      ok: response.status === 200,
      details: {
        requestClass,
        timeoutMs: REQUEST_TIMEOUT_POLICY_MS[requestClass as keyof typeof REQUEST_TIMEOUT_POLICY_MS],
        operation: sample.operation,
      },
    });
  }

  let timeoutFetchCalls = 0;
  let timeoutErrorName = "";
  try {
    await fetchWithRequestTimeout(
      "https://demo.supabase.co/rpc/get_my_role",
      { method: "POST" },
      {
        requestClass: "lightweight_lookup",
        timeoutMsOverride: 10,
        fetchImpl: async (_input, init) => {
          timeoutFetchCalls += 1;
          return await new Promise<Response>((_resolve, reject) => {
            const probe = setTimeout(() => {
              reject(init?.signal?.reason ?? new Error("timeout probe exhausted"));
            }, 30);
            init?.signal?.addEventListener(
              "abort",
              () => {
                clearTimeout(probe);
                reject(init.signal?.reason ?? new Error("aborted"));
              },
              { once: true },
            );
          });
        },
        screen: "request",
        surface: "fetch_timeout_verify",
        owner: "fetch_timeout_verify",
        operation: "get_my_role",
      },
    );
  } catch (error) {
    timeoutErrorName = error instanceof Error ? error.name : String(error);
    if (!(error instanceof RequestTimeoutError)) {
      throw error;
    }
  }

  const events = getPlatformObservabilityEvents().filter(
    (event) => event.surface === "fetch_timeout_verify" && event.event === "request_timeout_discipline",
  );
  const timeoutEvent = events.find((event) => event.result === "error" && event.errorStage === "timeout") ?? null;

  const sourceFiles = [
    "src/lib/supabaseClient.ts",
    "src/lib/postgrest.ts",
    "src/lib/api/directorProductionReportPdfBackend.service.ts",
    "src/lib/api/directorSubcontractReportPdfBackend.service.ts",
    "src/lib/api/directorFinanceSupplierPdfBackend.service.ts",
    "src/lib/files.ts",
    "src/lib/documents/attachmentOpener.ts",
  ];
  const sourceSnapshots = await Promise.all(
    sourceFiles.map(async (relativePath) => ({ relativePath, source: await readSource(relativePath) })),
  );

  const universalHardcodedPrimaryRemoved = !sourceSnapshots.some(
    ({ relativePath, source }) =>
      relativePath === "src/lib/supabaseClient.ts" && source.includes("const timeoutMs = 20_000"),
  );

  const fetchBoundaryUsageCount = sourceSnapshots.reduce((count, entry) => {
    return count + (entry.source.match(/fetchWithRequestTimeout/g)?.length ?? 0);
  }, 0);

  const checks: CheckResult[] = [
    ...successChecks,
    {
      name: "timeout_observability",
      ok:
        timeoutEvent?.extra?.requestClass === "lightweight_lookup" &&
        timeoutEvent?.extra?.timeoutFired === true,
      details: {
        timeoutEvent,
      },
    },
    {
      name: "no_hidden_retry",
      ok: timeoutFetchCalls === 1,
      details: {
        timeoutFetchCalls,
        timeoutErrorName,
      },
    },
    {
      name: "universal_hardcoded_timeout_removed_from_primary_owner",
      ok: universalHardcodedPrimaryRemoved,
      details: {
        sourceFile: "src/lib/supabaseClient.ts",
      },
    },
    {
      name: "shared_timeout_boundary_used_by_transport_owners",
      ok: fetchBoundaryUsageCount >= 7,
      details: {
        fetchBoundaryUsageCount,
      },
    },
  ];

  const status = checks.every((check) => check.ok) ? "GREEN" : "NOT_GREEN";

  await writeJson("request-timeout-class-map.json", {
    generatedAt: new Date().toISOString(),
    policyMs: REQUEST_TIMEOUT_POLICY_MS,
    compatibilityDefault: REQUEST_TIMEOUT_CLASS_MAP.compatibilityDefault,
    classMap: REQUEST_TIMEOUT_CLASS_MAP.classes,
    samples: Object.fromEntries(
      Object.entries(samples).map(([requestClass, sample]) => [
        requestClass,
        {
          requestClass: sample.requestClass,
          timeoutMs: sample.timeoutMs,
          owner: sample.owner,
          operation: sample.operation,
          endpointKind: sample.endpointKind,
          ruleId: sample.ruleId,
        },
      ]),
    ),
  });

  await writeJson("fetch-timeout-observability-proof.json", {
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    timeoutEvent,
    recentEvents: events.slice(-8),
  });

  await writeJson("fetch-timeout-policy-summary.json", {
    generatedAt: new Date().toISOString(),
    status,
    inventory: {
      primaryOwner: "src/lib/requestTimeoutPolicy.ts",
      transportOwners: sourceFiles,
      priorUniversalPrimaryTimeout: "src/lib/supabaseClient.ts:20_000ms",
      universalHardcodedPrimaryRemoved,
      fetchBoundaryUsageCount,
    },
    checks,
  });

  console.info(
    JSON.stringify(
      {
        status,
        checks: checks.map((check) => ({ name: check.name, ok: check.ok })),
      },
      null,
      2,
    ),
  );

  if (status !== "GREEN") {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

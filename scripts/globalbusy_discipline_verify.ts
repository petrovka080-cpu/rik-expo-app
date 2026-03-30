import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import { createGlobalBusyOwner } from "../src/ui/globalBusy.owner";

type CheckResult = {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
};

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");

const writeJson = async (fileName: string, value: unknown) => {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await writeFile(path.join(ARTIFACTS_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const readSource = async (relativePath: string) =>
  await readFile(path.join(ROOT, relativePath), "utf8");

async function run() {
  const providerSource = await readSource("src/ui/GlobalBusy.tsx");
  const ownerSource = await readSource("src/ui/globalBusy.owner.ts");
  const observabilitySource = await readSource("src/lib/observability/platformObservability.ts");

  const criticalConsumers = [
    "src/lib/pdfRunner.ts",
    "src/lib/documents/pdfDocumentActions.ts",
    "src/screens/director/director.proposal.row.tsx",
  ];
  const consumerSnapshots = await Promise.all(
    criticalConsumers.map(async (relativePath) => ({
      relativePath,
      source: await readSource(relativePath),
    })),
  );

  const inventory = {
    ownerProvider: "src/ui/GlobalBusy.tsx",
    ownerStateMachine: "src/ui/globalBusy.owner.ts",
    criticalConsumers,
    globalBusyScreenAdded: observabilitySource.includes('"global_busy"'),
    providerUsesOwnerBoundary:
      providerSource.includes("createGlobalBusyOwner")
      && !providerSource.includes("requestAnimationFrame")
      && !providerSource.includes("await sleep(60)"),
    consumerRunUsageCount: consumerSnapshots.reduce((count, entry) => {
      return count + (entry.source.match(/\bbusy\.run\(/g)?.length ?? 0);
    }, 0),
  };

  resetPlatformObservabilityEvents();
  let currentTime = 1_000;
  const waits: number[] = [];
  const successTimeline: string[] = [];
  const owner = createGlobalBusyOwner({
    now: () => currentTime,
    wait: async (ms) => {
      waits.push(ms);
      currentTime += ms;
    },
    longHeldMs: 1_000,
  });
  owner.setSnapshotListener((snapshot) => {
    successTimeline.push(`snapshot:${snapshot.uiKey ?? "none"}`);
  });

  const successResult = await owner.run(async () => {
    successTimeline.push("fn_started");
    currentTime += 40;
    return "ok";
  }, {
    key: "busy:success",
    label: "Busy success",
    minMs: 100,
  });

  let errorMessage = "";
  await owner.run(async () => {
    currentTime += 10;
    throw new Error("boom");
  }, {
    key: "busy:error",
    label: "Busy error",
    minMs: 300,
  }).catch((error) => {
    errorMessage = error instanceof Error ? error.message : String(error);
  });

  owner.show("busy:long", "Long held");
  currentTime += 1_250;
  owner.hide("busy:long");
  owner.hide("busy:missing");
  owner.show("busy:duplicate", "Duplicate");
  const duplicateResult = await owner.run(async () => "unreachable", {
    key: "busy:duplicate",
    label: "Duplicate",
  });
  owner.dispose();

  resetPlatformObservabilityEvents();
  let leakTime = 5_000;
  const leakOwner = createGlobalBusyOwner({
    now: () => leakTime,
    wait: async () => {},
  });
  leakOwner.show("busy:leak", "Leaked");
  leakTime += 25;
  leakOwner.dispose();
  const leakEvents = getPlatformObservabilityEvents();

  resetPlatformObservabilityEvents();
  const proofOwner = createGlobalBusyOwner({
    now: () => currentTime,
    wait: async () => {},
    longHeldMs: 1_000,
  });
  proofOwner.show("busy:proof", "Proof");
  currentTime += 1_250;
  proofOwner.hide("busy:proof");
  proofOwner.hide("busy:missing");
  const proofEvents = getPlatformObservabilityEvents();

  const checks: CheckResult[] = [
    {
      name: "busy_starts_without_pre_run_wait",
      ok: successTimeline[0] === "snapshot:busy:success" && successTimeline[1] === "fn_started",
      details: {
        successTimeline,
      },
    },
    {
      name: "success_release_is_deterministic",
      ok: successResult === "ok" && waits.length === 1 && waits[0] === 60,
      details: {
        successResult,
        waits,
      },
    },
    {
      name: "error_release_has_no_extra_wait",
      ok: errorMessage === "boom" && waits.length === 1,
      details: {
        errorMessage,
        waits,
      },
    },
    {
      name: "artificial_pre_run_wait_removed_from_primary_owner",
      ok:
        !providerSource.includes("requestAnimationFrame")
        && !providerSource.includes("await sleep(60)")
        && !providerSource.includes("sleep(60)"),
      details: {
        providerSourcePath: "src/ui/GlobalBusy.tsx",
      },
    },
    {
      name: "critical_consumers_still_use_global_busy_boundary",
      ok: inventory.consumerRunUsageCount >= 3,
      details: {
        consumerRunUsageCount: inventory.consumerRunUsageCount,
        criticalConsumers,
      },
    },
    {
      name: "mismatch_longheld_and_leak_are_observable",
      ok:
        proofEvents.some((event) => event.event === "busy_long_held" && event.result === "success")
        && proofEvents.some((event) => event.event === "busy_mismatch" && event.result === "error")
        && leakEvents.some((event) => event.event === "busy_dispose" && event.result === "error"),
      details: {
        proofEvents,
        leakEvents,
      },
    },
    {
      name: "no_force_unlock_hacks_added",
      ok:
        !ownerSource.includes("forceUnlock")
        && !ownerSource.includes("unlockTimer")
        && !ownerSource.includes("setTimeout(() => hide"),
      details: {
        ownerSourcePath: "src/ui/globalBusy.owner.ts",
      },
    },
    {
      name: "global_busy_observability_scope_is_explicit",
      ok: inventory.globalBusyScreenAdded,
      details: {
        screenAdded: inventory.globalBusyScreenAdded,
      },
    },
    {
      name: "duplicate_owner_does_not_start_hidden_retry",
      ok: duplicateResult === null,
      details: {
        duplicateResult,
      },
    },
  ];

  const status = checks.every((check) => check.ok) ? "GREEN" : "NOT_GREEN";

  await writeJson("globalbusy-lock-proof.json", {
    generatedAt: new Date().toISOString(),
    successTimeline,
    waits,
    proofEvents,
    leakEvents,
  });

  await writeJson("globalbusy-discipline-summary.json", {
    generatedAt: new Date().toISOString(),
    status,
    inventory,
    checks,
  });

  if (status !== "GREEN") {
    throw new Error("global busy discipline verify failed");
  }
}

run().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await writeJson("globalbusy-discipline-summary.json", {
    generatedAt: new Date().toISOString(),
    status: "NOT_GREEN",
    error: message,
  });
  await writeJson("globalbusy-lock-proof.json", {
    generatedAt: new Date().toISOString(),
    status: "NOT_GREEN",
    error: message,
  });
  console.error(message);
  process.exitCode = 1;
});

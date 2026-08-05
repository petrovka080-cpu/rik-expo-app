import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { scanFlatListTuningRegression } from "./flatListTuningRegression";

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function outputPath(): string {
  const prefix = "--output=";
  return path.resolve(
    process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ??
      "verification/v1/flatlist-runtime-inventory.json",
  );
}

const scannerPath = path.resolve("scripts/perf/flatListTuningRegression.ts");
const result = scanFlatListTuningRegression(process.cwd());
if (result.errors.length > 0) {
  throw new Error(`flatlist_inventory_has_violations:${JSON.stringify(result.errors)}`);
}
const instances = result.instances
  .map((instance) => ({
    file: instance.file,
    ordinal: instance.ordinal,
    kind: instance.kind,
    status: instance.status,
    has_initial_num_to_render: instance.hasInitialNumToRender,
    has_max_to_render_per_batch: instance.hasMaxToRenderPerBatch,
    has_window_size: instance.hasWindowSize,
    has_key_extractor: instance.hasKeyExtractor,
  }))
  .sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.ordinal - right.ordinal ||
      left.kind.localeCompare(right.kind),
  );
const body = {
  schema: "verification-flatlist-runtime-inventory:v1",
  scanner_sha256: sha256(fs.readFileSync(scannerPath)),
  generated_at_excluded_from_content_hash: true,
  summary: {
    runtime_instances: result.summary.runtimeInstances,
    flat_list_instances: result.summary.flatListInstances,
    flash_list_instances: result.summary.flashListInstances,
    tuned_instances: result.summary.tunedInstances,
    allowlisted_instances: result.summary.allowlistedInstances,
    violations: result.summary.violations,
  },
  instances,
};
const inventory = {
  ...body,
  generated_at: new Date().toISOString(),
  content_sha256: sha256(JSON.stringify(body)),
};
const target = outputPath();
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    final_status: "GREEN_EXACT_FLATLIST_RUNTIME_INVENTORY_REGENERATED",
    output_path: target,
    ...inventory.summary,
    content_sha256: inventory.content_sha256,
    file_sha256: sha256(fs.readFileSync(target)),
  }, null, 2)}\n`,
);

import fs from "node:fs";
import path from "node:path";

import {
  buildAiWarehouseLogisticsMagicButtonResults,
  buildAiWarehouseLogisticsMagicMatrix,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";

const screenMagicRoot = path.join(process.cwd(), "src", "features", "ai", "screenMagic");

describe("AI warehouse logistics no direct stock mutation", () => {
  it("routes warehouse actions to read, draft or approval without direct receive, issue or write-off", () => {
    const matrix = buildAiWarehouseLogisticsMagicMatrix({ webProofPass: true, androidProofPass: true });
    const results = buildAiWarehouseLogisticsMagicButtonResults();
    const screenMagicSource = fs.readdirSync(screenMagicRoot)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(screenMagicRoot, file), "utf8"))
      .join("\n");

    expect(matrix.direct_stock_mutation_paths_found).toBe(0);
    expect(matrix.direct_receive_paths_found).toBe(0);
    expect(matrix.direct_issue_paths_found).toBe(0);
    expect(matrix.direct_writeoff_paths_found).toBe(0);
    expect(matrix.approval_required_routes_to_ledger).toBe(true);
    expect(results.every((entry) => entry.canExecuteDirectly === false)).toBe(true);
    expect(results.every((entry) => entry.dbWriteUsed === false && entry.directMutationUsed === false)).toBe(true);
    expect(screenMagicSource).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
  });
});

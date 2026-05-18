import fs from "fs";
import path from "path";

import {
  DEFAULT_FLATLIST_TUNING_ALLOWLIST,
  scanFlatListTuningRegressionSource,
} from "../../scripts/perf/flatListTuningRegression";

const repoRoot = path.join(__dirname, "..", "..");
const modalPath = "src/screens/director/DirectorReportsModal.tsx";

describe("director reports modal FlatList tuning", () => {
  it("keeps all report-surface lists explicitly tuned without a report-surface allowlist", () => {
    const source = fs.readFileSync(path.join(repoRoot, modalPath), "utf8");
    const reportModalAllowlistEntries = DEFAULT_FLATLIST_TUNING_ALLOWLIST.filter(
      (entry) => entry.file === modalPath,
    );
    const result = scanFlatListTuningRegressionSource({
      file: modalPath,
      source,
      allowlist: reportModalAllowlistEntries,
    });

    expect(reportModalAllowlistEntries).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.summary.runtimeInstances).toBe(5);
    expect(result.summary.tunedInstances).toBe(5);
    expect(result.summary.allowlistedInstances).toBe(0);
    expect(source).toContain("const REPORT_LIST_TUNING = {");
    expect(source.match(/\{\.\.\.REPORT_LIST_TUNING\}/g)).toHaveLength(5);
  });
});

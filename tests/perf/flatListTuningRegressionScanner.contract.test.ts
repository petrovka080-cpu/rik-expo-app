import {
  scanFlatListTuningRegression,
  scanFlatListTuningRegressionSource,
  type FlatListTuningAllowlistEntry,
} from "../../scripts/perf/flatListTuningRegression";

const tunedFlashListSource = `
const ROW_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  windowSize: 7,
  removeClippedSubviews: false,
};
const rowKeyExtractor = (item: { id: string }) => item.id;
const renderItem = () => null;
const items: { id: string }[] = [];
export function Demo() {
  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={rowKeyExtractor}
      {...ROW_TUNING}
    />
  );
}
`;

function scanSource(source: string, allowlist: readonly FlatListTuningAllowlistEntry[] = []) {
  return scanFlatListTuningRegressionSource({
    file: "src/screens/DemoList.tsx",
    source,
    allowlist,
  });
}

describe("S_NIGHT_FLATLIST_22_TUNING_REGRESSION_SCANNER", () => {
  it("keeps the current runtime FlatList and FlashList inventory locked", () => {
    const result = scanFlatListTuningRegression(process.cwd());

    expect(result.errors).toEqual([]);
    expect(result.summary.runtimeInstances).toBe(61);
    expect(result.summary.flatListInstances).toBe(7);
    expect(result.summary.flashListInstances).toBe(54);
    expect(result.summary.violations).toBe(0);
    expect(result.summary.allowlistEntries).toBeGreaterThan(0);
    expect(result.summary.matchedAllowlistEntries).toBe(result.summary.allowlistEntries);
    expect(result.summary.editableHeavyExceptions).toBe(1);
    expect(result.summary.nestedInventoryRequired).toBe(true);
  });

  it("detects a heavy runtime list missing windowSize", () => {
    const result = scanSource(tunedFlashListSource.replace("  windowSize: 7,\n", ""));

    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("missing windowSize")]));
    expect(result.summary.missingWindowSize).toBe(1);
  });

  it("detects a heavy runtime list missing initialNumToRender", () => {
    const result = scanSource(tunedFlashListSource.replace("  initialNumToRender: 8,\n", ""));

    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("missing initialNumToRender")]));
    expect(result.summary.missingInitialNumToRender).toBe(1);
  });

  it("detects a heavy runtime list missing maxToRenderPerBatch", () => {
    const result = scanSource(tunedFlashListSource.replace("  maxToRenderPerBatch: 8,\n", ""));

    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("missing maxToRenderPerBatch")]));
    expect(result.summary.missingMaxToRenderPerBatch).toBe(1);
  });

  it("detects a heavy runtime list missing keyExtractor", () => {
    const result = scanSource(tunedFlashListSource.replace("      keyExtractor={rowKeyExtractor}\n", ""));

    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("missing keyExtractor")]));
    expect(result.summary.missingKeyExtractor).toBe(1);
  });

  it("allows a documented exception only with owner, reason, and layout proof", () => {
    const allowlist: FlatListTuningAllowlistEntry[] = [
      {
        file: "src/screens/DemoList.tsx",
        ordinal: 1,
        kind: "FlashList",
        owner: "demo owner",
        reason: "demo nested inventory exception",
        layoutProof: "demo modal viewport bounds visible rows",
        scope: "nested_modal",
      },
    ];
    const result = scanSource(
      `
export function Demo() {
  return (
    <FlashList data={[]} renderItem={() => null} />
  );
}
`,
      allowlist,
    );

    expect(result.errors).toEqual([]);
    expect(result.summary.allowlistedInstances).toBe(1);
  });

  it("fails an exception without required documentation", () => {
    const allowlist: FlatListTuningAllowlistEntry[] = [
      {
        file: "src/screens/DemoList.tsx",
        ordinal: 1,
        kind: "FlashList",
        owner: "",
        reason: "",
        layoutProof: "",
        scope: "nested_modal",
      },
    ];
    const result = scanSource(
      `
export function Demo() {
  return (
    <FlashList data={[]} renderItem={() => null} />
  );
}
`,
      allowlist,
    );

    expect(result.errors).toEqual([
      "allowlist entry src/screens/DemoList.tsx#1#FlashList is missing owner",
      "allowlist entry src/screens/DemoList.tsx#1#FlashList is missing reason",
      "allowlist entry src/screens/DemoList.tsx#1#FlashList is missing layout proof",
    ]);
    expect(result.summary.allowlistMetadataErrors).toBe(3);
  });
});

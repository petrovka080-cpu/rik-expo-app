import fs from "node:fs";
import path from "node:path";

describe("request draft title heading", () => {
  it("keeps a single draft title source in the restored request panel", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src", "features", "consumerRepair", "ConsumerRepairDraftPanel.tsx"),
      "utf8",
    );
    const titleOccurrences = source.match(/<Text style=\{styles\.title\}>/g) ?? [];
    expect(titleOccurrences).toHaveLength(1);
    expect(source).toContain('testID="consumer-repair-draft"');
  });
});

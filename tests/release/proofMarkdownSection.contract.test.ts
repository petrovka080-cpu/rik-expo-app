import { replaceMarkdownSection } from "../../scripts/e2e/proofMarkdownSection";

describe("proof markdown section replacement", () => {
  it("replaces every stale copy of the same section with one current section", () => {
    const markdown = [
      "# Proof",
      "",
      "Runtime proof passed: true",
      "",
      "## Android API34 Canonical Replay",
      "Replay status: OLD",
      "",
      "## Android API34 Canonical Replay",
      "Replay status: OLDER",
      "",
      "## Another Section",
      "Still here",
    ].join("\n");

    const next = replaceMarkdownSection(
      markdown,
      "## Android API34 Canonical Replay",
      ["## Android API34 Canonical Replay", "Replay status: GREEN"].join("\n"),
    );

    expect(next.match(/## Android API34 Canonical Replay/g)).toHaveLength(1);
    expect(next).toContain("Replay status: GREEN");
    expect(next).not.toContain("Replay status: OLD");
    expect(next).not.toContain("Replay status: OLDER");
    expect(next).toContain("## Another Section\nStill here");
  });
});

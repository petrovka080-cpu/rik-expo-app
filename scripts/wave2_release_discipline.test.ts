import {
  evaluateReleaseDiscipline,
  intrinsicPathKind,
  type ReleaseLedger,
} from "./_shared/wave2ReleaseDiscipline";

const baseLedger: ReleaseLedger = {
  batchName: "wave2-operational-hardening-subphase1",
  date: "2026-03-31",
  scope: ["Wave 2 / Release Discipline + Cross-Role Regression Gate"],
  exactChangedFiles: ["docs/architecture/wave2-green-definition.md"],
  exactSqlMigrations: [],
  exactScriptsVerifiers: ["scripts/wave2_release_discipline_verify.ts"],
  exactTestCommands: ["npx jest --runInBand scripts/wave2_release_discipline.test.ts"],
  proofArtifacts: {
    required: ["artifacts/release-discipline-summary.json"],
    optional: [],
    transient: [],
  },
  commitSha: "1234567",
  pushTarget: "origin/main",
  ota: {
    published: false,
    development: null,
    preview: null,
    production: null,
    note: "docs-and-verifier batch; OTA intentionally not published in unit test",
  },
  rollbackNote: "revert narrow Wave 2 docs/scripts batch",
  honestStatus: "GREEN",
  knownExclusions: [
    {
      path: "src/lib/rik_api.ts",
      reason: "unrelated accounting batch leftover",
      classification: "release-critical",
    },
  ],
};

describe("wave2 release discipline helpers", () => {
  it("classifies artifact and local-only paths explicitly", () => {
    expect(intrinsicPathKind("artifacts/cross-role-regression-summary.json")).toBe("generated-allowed");
    expect(intrinsicPathKind("System.Management.Automation.Internal.Host.InternalHost")).toBe("local-only");
    expect(intrinsicPathKind("src/lib/rik_api.ts")).toBe("release-critical");
  });

  it("passes when dirty paths are fully classified and proofs exist", () => {
    const result = evaluateReleaseDiscipline(
      baseLedger,
      [
        { path: "docs/architecture/wave2-green-definition.md", gitCode: "M " },
        { path: "src/lib/rik_api.ts", gitCode: "M " },
      ],
      new Set([
        "docs/architecture/wave2-green-definition.md",
        "scripts/wave2_release_discipline_verify.ts",
        "artifacts/release-discipline-summary.json",
      ]),
    );

    expect(result.greenDefinitionSatisfied).toBe(true);
    expect(result.unaccountedDirtyPaths).toHaveLength(0);
    expect(result.forbiddenLocalOnlyPaths).toHaveLength(0);
    expect(result.missingRequiredProofs).toHaveLength(0);
  });

  it("fails when local-only junk remains in the release worktree", () => {
    const result = evaluateReleaseDiscipline(
      baseLedger,
      [{ path: "System.Management.Automation.Internal.Host.InternalHost", gitCode: "??" }],
      new Set(["artifacts/release-discipline-summary.json"]),
    );

    expect(result.greenDefinitionSatisfied).toBe(false);
    expect(result.forbiddenLocalOnlyPaths).toContain("System.Management.Automation.Internal.Host.InternalHost");
  });
});

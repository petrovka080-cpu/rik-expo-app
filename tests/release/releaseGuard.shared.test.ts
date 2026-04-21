import {
  buildReleaseChangedFilesGitArgs,
  classifyPackageJsonMutation,
  classifyReleaseChanges,
  evaluateReleaseGuardReadiness,
  parseEasUpdateOutput,
  resolveReleaseGuardPath,
  type ReleaseGateResult,
  type ReleaseRepoState,
} from "../../scripts/release/releaseGuard.shared";

function createRepoState(overrides: Partial<ReleaseRepoState> = {}): ReleaseRepoState {
  return {
    gitBranch: "main",
    headCommit: "head-sha",
    originMainCommit: "head-sha",
    worktreeClean: true,
    headMatchesOriginMain: true,
    ...overrides,
  };
}

function createPassedGates(): ReleaseGateResult[] {
  return [
    { name: "tsc", command: "npx tsc --noEmit --pretty false", status: "passed", exitCode: 0 },
    { name: "expo-lint", command: "npx expo lint", status: "passed", exitCode: 0 },
    { name: "jest-run-in-band", command: "npm test -- --runInBand", status: "passed", exitCode: 0 },
    { name: "jest", command: "npm test", status: "passed", exitCode: 0 },
    { name: "git-diff-check", command: "git diff --check", status: "passed", exitCode: 0 },
  ];
}

describe("releaseGuard.shared", () => {
  describe("classifyPackageJsonMutation", () => {
    it("treats scripts-only package.json changes as non-runtime", () => {
      const previousSource = JSON.stringify(
        {
          name: "rik-expo-app",
          scripts: {
            test: "jest",
          },
          devDependencies: {
            jest: "^29.7.0",
          },
        },
        null,
        2,
      );
      const currentSource = JSON.stringify(
        {
          name: "rik-expo-app",
          scripts: {
            test: "jest",
            "release:preflight": "tsx scripts/release/run-release-guard.ts preflight",
          },
          devDependencies: {
            jest: "^29.7.0",
          },
        },
        null,
        2,
      );

      expect(
        classifyPackageJsonMutation({
          previousSource,
          currentSource,
        }),
      ).toBe("scripts-only");
    });

    it("blocks package.json dependency changes from OTA classification", () => {
      const previousSource = JSON.stringify(
        {
          name: "rik-expo-app",
          dependencies: {
            expo: "~54.0.33",
          },
        },
        null,
        2,
      );
      const currentSource = JSON.stringify(
        {
          name: "rik-expo-app",
          dependencies: {
            expo: "~55.0.0",
          },
        },
        null,
        2,
      );

      expect(
        classifyPackageJsonMutation({
          previousSource,
          currentSource,
        }),
      ).toBe("build-required");
    });
  });

  describe("classifyReleaseChanges", () => {
    it("classifies tooling/docs/test-only diffs as non-runtime and skips OTA", () => {
      const classification = classifyReleaseChanges({
        changedFiles: [
          "docs/operations/eas-update-runbook.md",
          "scripts/release/run-release-guard.ts",
          "tests/release/releaseGuard.shared.test.ts",
          "package.json",
        ],
        packageJsonMutationKind: "scripts-only",
      });

      expect(classification.kind).toBe("non-runtime");
      expect(classification.runtimeFiles).toEqual([]);
      expect(classification.buildRequiredFiles).toEqual([]);
      expect(classification.nonRuntimeFiles).toContain("package.json");
    });

    it("classifies runtime TS/TSX changes as OTA-eligible runtime work", () => {
      const classification = classifyReleaseChanges({
        changedFiles: [
          "src/screens/office/OfficeShellContent.tsx",
          "docs/operations/eas-update-runbook.md",
        ],
      });

      expect(classification.kind).toBe("runtime-ota");
      expect(classification.changeClass).toBe("js-ui");
      expect(classification.runtimeFiles).toContain("src/screens/office/OfficeShellContent.tsx");
    });

    it("blocks OTA when native or release-host files changed", () => {
      const classification = classifyReleaseChanges({
        changedFiles: ["app.json", "scripts/release/run-release-guard.ts"],
      });

      expect(classification.kind).toBe("build-required");
      expect(classification.buildRequiredFiles).toContain("app.json");
    });
  });

  describe("evaluateReleaseGuardReadiness", () => {
    it("blocks invalid releases when repo state is dirty or a required gate failed", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "ota",
        repo: createRepoState({
          worktreeClean: false,
          headMatchesOriginMain: false,
          originMainCommit: "origin-sha",
        }),
        gates: [
          ...createPassedGates().slice(0, 2),
          {
            name: "jest-run-in-band",
            command: "npm test -- --runInBand",
            status: "failed",
            exitCode: 1,
          },
          ...createPassedGates().slice(3),
        ],
        classification: classifyReleaseChanges({
          changedFiles: ["src/screens/office/OfficeShellContent.tsx"],
        }),
        targetChannel: "production",
        releaseMessage: "Office split",
        missingArtifacts: [],
        expectedBranch: "production",
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.otaDisposition).toBe("block");
      expect(readiness.blockers).toEqual(
        expect.arrayContaining([
          "Worktree is dirty. Release automation requires a clean repository state.",
          "HEAD does not match origin/main. Push and sync the exact release commit before publishing.",
          "Required gate failed: jest-run-in-band.",
        ]),
      );
    });

    it("skips OTA cleanly for a non-runtime release commit", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "ota",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["docs/operations/eas-update-runbook.md"],
        }),
        targetChannel: "production",
        releaseMessage: "Docs only",
        missingArtifacts: [],
        expectedBranch: "production",
      });

      expect(readiness.status).toBe("pass");
      expect(readiness.otaDisposition).toBe("skip");
      expect(readiness.blockers).toEqual([]);
    });

    it("requires explicit OTA metadata for runtime releases", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "ota",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["src/lib/documents/pdfDocumentActions.ts"],
        }),
        targetChannel: "production",
        releaseMessage: null,
        missingArtifacts: ["artifacts/missing-proof.json"],
        expectedBranch: "production",
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.blockers).toEqual(
        expect.arrayContaining([
          "Required artifact is missing: artifacts/missing-proof.json",
          "Runtime OTA publish requires a non-empty --message.",
        ]),
      );
    });
  });

  describe("parseEasUpdateOutput", () => {
    it("extracts release metadata from EAS publish output", () => {
      const metadata = parseEasUpdateOutput(`
Branch             production
Runtime version    1.0.0
Platform           android, ios
Update group ID    group-123
Android update ID  android-123
iOS update ID      ios-123
Message            OFFICE_OWNER_SPLIT
Commit             abc123
EAS Dashboard      https://expo.dev/update/group-123
`);

      expect(metadata).toEqual({
        branch: "production",
        runtimeVersion: "1.0.0",
        platform: "android, ios",
        updateGroupId: "group-123",
        androidUpdateId: "android-123",
        iosUpdateId: "ios-123",
        message: "OFFICE_OWNER_SPLIT",
        commit: "abc123",
        dashboardUrl: "https://expo.dev/update/group-123",
      });
    });
  });

  describe("resolveReleaseGuardPath", () => {
    it("keeps absolute paths untouched", () => {
      expect(resolveReleaseGuardPath("C:\\repo", "C:\\temp\\release-guard.json")).toBe("C:\\temp\\release-guard.json");
    });

    it("resolves relative paths from the project root", () => {
      expect(resolveReleaseGuardPath("C:\\repo", "artifacts/release-guard.json").replace(/\\/g, "/")).toBe(
        "C:/repo/artifacts/release-guard.json",
      );
    });
  });

  describe("buildReleaseChangedFilesGitArgs", () => {
    it("uses diff-tree for a single-head repository range", () => {
      expect(buildReleaseChangedFilesGitArgs("HEAD")).toEqual([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        "HEAD",
      ]);
    });

    it("preserves caret commit ranges as a single git argument", () => {
      expect(buildReleaseChangedFilesGitArgs("HEAD^..HEAD")).toEqual([
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        "HEAD^..HEAD",
      ]);
    });
  });
});

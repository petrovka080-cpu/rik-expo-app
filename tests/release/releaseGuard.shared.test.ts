import {
  RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES,
  buildReleaseChangedFilesGitArgs,
  buildReleaseGuardOtaPublishCommand,
  buildReleaseGuardOtaPublishEnv,
  buildReleaseMetadataEnforcement,
  buildReleaseGuardMigrationPolicy,
  classifyPackageJsonMutation,
  classifyReleaseChanges,
  evaluateReleaseGuardReadiness,
  parseEasUpdateOutput,
  resolveReleaseGuardCommitRange,
  resolveReleaseGuardPath,
  resolveReleaseRepoSync,
  type ReleaseGateResult,
  type ReleaseRepoState,
  type ReleaseGuardStartupPolicyTruth,
  type ReleaseGuardRuntimePolicyTruth,
} from "../../scripts/release/releaseGuard.shared";

function createRepoState(overrides: Partial<ReleaseRepoState> = {}): ReleaseRepoState {
  return {
    gitBranch: "main",
    headCommit: "head-sha",
    originMainCommit: "head-sha",
    worktreeClean: true,
    headMatchesOriginMain: true,
    localCommitsAheadOriginMain: 0,
    originMainCommitsAheadHead: 0,
    syncStatus: "synced",
    syncAction: "none",
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

function createRuntimePolicyTruth(
  overrides: Partial<ReleaseGuardRuntimePolicyTruth> = {},
): ReleaseGuardRuntimePolicyTruth {
  return {
    resolvedRuntimeVersion: "policy:fingerprint",
    runtimePolicy: "policy:fingerprint",
    runtimeVersionStrategy: "fingerprint",
    runtimePolicyValid: true,
    runtimePolicyReason: "runtimeVersion uses the fingerprint policy.",
    runtimeProofConsistent: true,
    runtimeProofReason: "release extra truth matches the configured runtime policy.",
    buildRequired: false,
    ...overrides,
  };
}

function createStartupPolicyTruth(
  overrides: Partial<ReleaseGuardStartupPolicyTruth> = {},
): ReleaseGuardStartupPolicyTruth {
  return {
    updatesEnabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 30000,
    startupPolicyValid: true,
    startupPolicyReason: "Release startup policy is ON_LOAD with fallbackToCacheTimeout=30000.",
    ...overrides,
  };
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

    it("treats phase tsconfig files as tooling so they do not block OTA classification", () => {
      const classification = classifyReleaseChanges({
        changedFiles: [
          "src/screens/director/director.finance.rpc.ts",
          "tsconfig.strict-null-phase1.json",
        ],
      });

      expect(classification.kind).toBe("runtime-ota");
      expect(classification.runtimeFiles).toContain("src/screens/director/director.finance.rpc.ts");
      expect(classification.nonRuntimeFiles).toContain("tsconfig.strict-null-phase1.json");
      expect(classification.buildRequiredFiles).toEqual([]);
    });

    it("treats Maestro E2E harness files as non-runtime release evidence", () => {
      const classification = classifyReleaseChanges({
        changedFiles: [
          "src/screens/director/DirectorDashboard.tsx",
          "maestro/flows/critical/office-safe-entry.yaml",
          "artifacts/V4_8B_profile_entry_harness_proof.md",
        ],
      });

      expect(classification.kind).toBe("runtime-ota");
      expect(classification.changeClass).toBe("js-ui");
      expect(classification.runtimeFiles).toContain("src/screens/director/DirectorDashboard.tsx");
      expect(classification.nonRuntimeFiles).toContain("maestro/flows/critical/office-safe-entry.yaml");
      expect(classification.buildRequiredFiles).toEqual([]);
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
          localCommitsAheadOriginMain: 2,
          syncStatus: "local_ahead",
          syncAction: "push_with_explicit_approval",
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
        runtimePolicy: createRuntimePolicyTruth(),
        startupPolicy: createStartupPolicyTruth(),
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
          "HEAD does not match origin/main. Local branch is ahead by 2 commit(s) and behind by 0 commit(s). Next safe action: push_with_explicit_approval. Push and sync the exact release commit before publishing.",
          "Required gate failed: jest-run-in-band.",
        ]),
      );
    });

    it("resolves branch sync actions without requiring release operators to infer them", () => {
      expect(
        resolveReleaseRepoSync({
          headMatchesOriginMain: true,
          localCommitsAheadOriginMain: 0,
          originMainCommitsAheadHead: 0,
        }),
      ).toEqual({ syncStatus: "synced", syncAction: "none" });

      expect(
        resolveReleaseRepoSync({
          headMatchesOriginMain: false,
          localCommitsAheadOriginMain: 2,
          originMainCommitsAheadHead: 0,
        }),
      ).toEqual({ syncStatus: "local_ahead", syncAction: "push_with_explicit_approval" });

      expect(
        resolveReleaseRepoSync({
          headMatchesOriginMain: false,
          localCommitsAheadOriginMain: 0,
          originMainCommitsAheadHead: 1,
        }),
      ).toEqual({ syncStatus: "origin_ahead", syncAction: "pull_or_rebase_before_release" });

      expect(
        resolveReleaseRepoSync({
          headMatchesOriginMain: false,
          localCommitsAheadOriginMain: 2,
          originMainCommitsAheadHead: 1,
        }),
      ).toEqual({ syncStatus: "diverged", syncAction: "reconcile_diverged_branch" });
    });

    it("uses the whole local release train as the default range when local commits are ahead", () => {
      expect(
        resolveReleaseGuardCommitRange({
          explicitRange: null,
          repo: createRepoState({ localCommitsAheadOriginMain: 4 }),
          headParentExists: true,
        }),
      ).toBe("origin/main..HEAD");

      expect(
        resolveReleaseGuardCommitRange({
          explicitRange: "main..feature",
          repo: createRepoState({ localCommitsAheadOriginMain: 4 }),
          headParentExists: true,
        }),
      ).toBe("main..feature");

      expect(
        resolveReleaseGuardCommitRange({
          explicitRange: null,
          repo: createRepoState(),
          headParentExists: true,
        }),
      ).toBe("HEAD^..HEAD");

      expect(
        resolveReleaseGuardCommitRange({
          explicitRange: null,
          repo: createRepoState(),
          headParentExists: false,
        }),
      ).toBe("HEAD");
    });

    it("skips OTA cleanly for a non-runtime release commit", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "ota",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["docs/operations/eas-update-runbook.md"],
        }),
        runtimePolicy: createRuntimePolicyTruth(),
        startupPolicy: createStartupPolicyTruth(),
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
        runtimePolicy: createRuntimePolicyTruth(),
        startupPolicy: createStartupPolicyTruth(),
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

    it("blocks OTA entirely when the release classification requires a new build", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "ota",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["app.json"],
        }),
        runtimePolicy: createRuntimePolicyTruth({
          buildRequired: true,
        }),
        startupPolicy: createStartupPolicyTruth(),
        targetChannel: "production",
        releaseMessage: "Runtime fingerprint policy",
        missingArtifacts: [],
        expectedBranch: "production",
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.otaDisposition).toBe("block");
      expect(readiness.blockers).toContain("Release classification requires a new build. OTA publish is blocked.");
    });

    it("keeps build-required runtime policy migrations as pass/block during verify mode", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "verify",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["app.json", "tests/release/release-safety.test.ts"],
        }),
        runtimePolicy: createRuntimePolicyTruth({
          buildRequired: true,
        }),
        startupPolicy: createStartupPolicyTruth(),
        targetChannel: null,
        releaseMessage: null,
        missingArtifacts: [],
        expectedBranch: null,
      });

      expect(readiness.status).toBe("pass");
      expect(readiness.otaDisposition).toBe("block");
      expect(readiness.blockers).toEqual([]);
    });

    it("fails when runtime policy truth is invalid even if the repo gates are green", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "verify",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["tests/release/releaseConfig.shared.test.ts"],
        }),
        runtimePolicy: createRuntimePolicyTruth({
          runtimeVersionStrategy: "fixed",
          runtimePolicyValid: false,
          runtimePolicyReason:
            'Static runtimeVersion strings are invalid for this repo. Use expo.runtimeVersion = { "policy": "fingerprint" }.',
        }),
        startupPolicy: createStartupPolicyTruth(),
        targetChannel: null,
        releaseMessage: null,
        missingArtifacts: [],
        expectedBranch: null,
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.otaDisposition).toBe("block");
      expect(readiness.blockers).toContain(
        'Runtime policy invalid: Static runtimeVersion strings are invalid for this repo. Use expo.runtimeVersion = { "policy": "fingerprint" }.',
      );
    });

    it("fails when runtime proof no longer matches the configured policy", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "verify",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["tests/release/release-safety.test.ts"],
        }),
        runtimePolicy: createRuntimePolicyTruth({
          runtimeProofConsistent: false,
          runtimeProofReason:
            'extra.release.runtimePolicy must equal "policy:fingerprint", but found "fixed(1.0.0)".',
        }),
        startupPolicy: createStartupPolicyTruth(),
        targetChannel: null,
        releaseMessage: null,
        missingArtifacts: [],
        expectedBranch: null,
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.otaDisposition).toBe("block");
      expect(readiness.blockers).toContain(
        'Runtime proof mismatch: extra.release.runtimePolicy must equal "policy:fingerprint", but found "fixed(1.0.0)".',
      );
    });

    it("fails when the release startup policy drifts from ON_LOAD + 30000", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "verify",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: ["app.json"],
        }),
        runtimePolicy: createRuntimePolicyTruth({
          buildRequired: true,
        }),
        startupPolicy: createStartupPolicyTruth({
          fallbackToCacheTimeout: 0,
          startupPolicyValid: false,
          startupPolicyReason:
            "expo.updates.fallbackToCacheTimeout must be 30000 for the guarded release startup contract, but found 0.",
        }),
        targetChannel: null,
        releaseMessage: null,
        missingArtifacts: [],
        expectedBranch: null,
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.otaDisposition).toBe("block");
      expect(readiness.blockers).toContain(
        "Startup policy invalid: expo.updates.fallbackToCacheTimeout must be 30000 for the guarded release startup contract, but found 0.",
      );
    });
  });

  describe("buildReleaseGuardMigrationPolicy", () => {
    it("keeps schema-only Supabase migrations visible without blocking release automation", () => {
      const migrationPolicy = buildReleaseGuardMigrationPolicy({
        changedFiles: ["supabase/migrations/20260502170000_scale_idempotency_records_provider_smoke.sql"],
        readFile: () => `
          create table if not exists public.scale_idempotency_records (
            key text not null,
            operation text not null
          );

          create index if not exists scale_idempotency_records_operation_idx
            on public.scale_idempotency_records(operation);

          alter table public.scale_idempotency_records enable row level security;
        `,
      });

      expect(migrationPolicy.productionDbApprovalRequired).toBe(false);
      expect(migrationPolicy.requiredApprovalKeys).toEqual([]);
      expect(migrationPolicy.nextSafeWave).toBeNull();
      expect(migrationPolicy.blockers).toEqual([]);
      expect(migrationPolicy.risks).toEqual([
        expect.objectContaining({
          filePath: "supabase/migrations/20260502170000_scale_idempotency_records_provider_smoke.sql",
          riskLevel: "schema",
          schemaChangesDetected: true,
          productionDbApprovalRequired: false,
        }),
      ]);
    });

    it("blocks DML or read-model rebuild migrations until an explicit DB apply/repair wave handles them", () => {
      const migrationPolicy = buildReleaseGuardMigrationPolicy({
        changedFiles: ["supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql"],
        readFile: () => `
          create table if not exists public.warehouse_issue_queue_ready_rows_v1 (
            request_id integer primary key
          );

          create or replace function public.warehouse_issue_queue_ready_rows_rebuild_v1()
          returns void
          language plpgsql
          security definer
          as $$
          begin
            delete from public.warehouse_issue_queue_ready_rows_v1;
            insert into public.warehouse_issue_queue_ready_rows_v1 (request_id)
            select id from public.requests;
          end;
          $$;

          notify pgrst, 'reload schema';
        `,
      });

      expect(migrationPolicy.productionDbApprovalRequired).toBe(true);
      expect(migrationPolicy.requiredApprovalKeys).toEqual([
        "S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED",
        "S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED",
      ]);
      expect(migrationPolicy.nextSafeWave).toBe(
        "S-PRODUCTION-MIGRATION-GAP-APPLY-OR-REPAIR-1-WITH-EXPLICIT-DB-WRITE-APPROVAL",
      );
      expect(migrationPolicy.highRiskFiles).toEqual([
        "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
      ]);
      expect(migrationPolicy.blockers).toEqual([
        expect.stringContaining("S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED"),
      ]);
      expect(migrationPolicy.risks[0]).toEqual(
        expect.objectContaining({
          riskLevel: "dml_or_rebuild",
          dmlStatementsDetected: expect.arrayContaining(["insert", "delete"]),
          readModelRebuildDetected: true,
          productionDbApprovalRequired: true,
        }),
      );
    });

    it("adds migration policy blockers to release readiness", () => {
      const readiness = evaluateReleaseGuardReadiness({
        mode: "verify",
        repo: createRepoState(),
        gates: createPassedGates(),
        classification: classifyReleaseChanges({
          changedFiles: [
            "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
          ],
        }),
        migrationPolicy: {
          migrationFiles: [
            "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
          ],
          highRiskFiles: [
            "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
          ],
          productionDbApprovalRequired: true,
          requiredApprovalKeys: [
            "S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED",
            "S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED",
          ],
          nextSafeWave: "S-PRODUCTION-MIGRATION-GAP-APPLY-OR-REPAIR-1-WITH-EXPLICIT-DB-WRITE-APPROVAL",
          risks: [],
          blockers: [
            "Supabase migration supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql contains DML or read-model rebuild behavior and requires S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED, S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED before release automation can proceed.",
          ],
        },
        runtimePolicy: createRuntimePolicyTruth(),
        startupPolicy: createStartupPolicyTruth(),
        targetChannel: null,
        releaseMessage: null,
        missingArtifacts: [],
        expectedBranch: null,
      });

      expect(readiness.status).toBe("fail");
      expect(readiness.blockers).toEqual([
        expect.stringContaining("S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED"),
      ]);
    });
  });

  describe("parseEasUpdateOutput", () => {
    it("extracts release metadata from EAS publish output", () => {
      const metadata = parseEasUpdateOutput(`
Branch             production
Runtime version    7f8c145b6f7dd986d2757d5a4d683d86f3c3d469
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
        runtimeVersion: "7f8c145b6f7dd986d2757d5a4d683d86f3c3d469",
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

  describe("buildReleaseMetadataEnforcement", () => {
    it("accepts otaDisposition=skip and reports channel metadata as not applicable", () => {
      const releaseMetadata = buildReleaseMetadataEnforcement({
        repo: createRepoState(),
        appVersion: "1.0.0",
        configuredIosBuildNumber: "13",
        configuredAndroidVersionCode: "13",
        appVersionSource: "remote",
        runtimeVersion: "policy:fingerprint",
        runtimePolicyValid: true,
        runtimeProofConsistent: true,
        startupPolicyValid: true,
        readiness: {
          status: "pass",
          otaDisposition: "skip",
          blockers: [],
        },
        targetChannel: null,
        expectedBranch: null,
        otaPublish: null,
      });

      expect(releaseMetadata.otaDisposition).toBe("skip");
      expect(releaseMetadata.rollbackReady).toBe(true);
      expect(releaseMetadata.channel).toBe("not_applicable");
      expect(releaseMetadata.branch).toBe("not_applicable");
      expect(releaseMetadata.otaPublished).toBe(false);
      expect(releaseMetadata.easBuildTriggered).toBe(false);
      expect(releaseMetadata.easSubmitTriggered).toBe(false);
    });

    it("reports missing required metadata explicitly", () => {
      const releaseMetadata = buildReleaseMetadataEnforcement({
        repo: createRepoState({ headCommit: "" }),
        appVersion: "",
        configuredIosBuildNumber: "",
        configuredAndroidVersionCode: "",
        appVersionSource: "",
        runtimeVersion: "",
        runtimePolicyValid: true,
        runtimeProofConsistent: true,
        startupPolicyValid: true,
        readiness: {
          status: "pass",
          otaDisposition: "allow",
          blockers: [],
        },
        targetChannel: null,
        expectedBranch: null,
        otaPublish: null,
      });

      expect(releaseMetadata.otaDisposition).toBe("candidate");
      expect(releaseMetadata.missing).toEqual(
        expect.arrayContaining([
          "gitSha",
          "appVersion",
          "buildLineage",
          "runtimeVersion",
          "channel",
          "branch",
        ]),
      );
      expect(releaseMetadata.rollbackReady).toBe(false);
    });

    it("does not claim Sentry or binary source map proof unless publish proof exists", () => {
      const releaseMetadata = buildReleaseMetadataEnforcement({
        repo: createRepoState(),
        appVersion: "1.0.0",
        configuredIosBuildNumber: "13",
        configuredAndroidVersionCode: "13",
        appVersionSource: "remote",
        runtimeVersion: "policy:fingerprint",
        runtimePolicyValid: true,
        runtimeProofConsistent: true,
        startupPolicyValid: true,
        readiness: {
          status: "pass",
          otaDisposition: "allow",
          blockers: [],
        },
        targetChannel: "production",
        expectedBranch: "production",
        otaPublish: null,
      });

      expect(releaseMetadata.otaDisposition).toBe("candidate");
      expect(releaseMetadata.sentrySourceMaps).toBe("not_applicable");
      expect(releaseMetadata.binarySourceMapsProven).toBe("not_applicable");
      expect(releaseMetadata.otaPublished).toBe(false);
      expect(releaseMetadata.easUpdateTriggered).toBe(false);
    });

    it("marks source map proof as missing for a published OTA report without proof artifacts", () => {
      const releaseMetadata = buildReleaseMetadataEnforcement({
        repo: createRepoState(),
        appVersion: "1.0.0",
        configuredIosBuildNumber: "13",
        configuredAndroidVersionCode: "13",
        appVersionSource: "remote",
        runtimeVersion: "policy:fingerprint",
        runtimePolicyValid: true,
        runtimeProofConsistent: true,
        startupPolicyValid: true,
        readiness: {
          status: "pass",
          otaDisposition: "allow",
          blockers: [],
        },
        targetChannel: "production",
        expectedBranch: "production",
        otaPublish: {
          branch: "production",
          runtimeVersion: "policy:fingerprint",
          platform: "android, ios",
          updateGroupId: "group-123",
          androidUpdateId: "android-123",
          iosUpdateId: "ios-123",
          message: "release",
          commit: "head-sha",
          dashboardUrl: "https://expo.dev/update/group-123",
        },
      });

      expect(releaseMetadata.otaDisposition).toBe("published");
      expect(releaseMetadata.sentrySourceMaps).toBe("missing");
      expect(releaseMetadata.binarySourceMapsProven).toBe("missing");
      expect(releaseMetadata.missing).toEqual(
        expect.arrayContaining(["sentrySourceMaps", "binarySourceMapsProven"]),
      );
      expect(releaseMetadata.otaPublished).toBe(true);
      expect(releaseMetadata.easUpdateTriggered).toBe(true);
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

  describe("buildReleaseGuardOtaPublishEnv", () => {
    it("forces CI for guarded OTA publishes when the base env is interactive", () => {
      expect(
        buildReleaseGuardOtaPublishEnv({
          ...process.env,
          EXPO_TOKEN: "token",
        }).CI,
      ).toBe("1");
    });

    it("preserves an explicit CI value from the caller environment", () => {
      expect(
        buildReleaseGuardOtaPublishEnv({
          ...process.env,
          CI: "already-set",
          EXPO_TOKEN: "token",
        }).CI,
      ).toBe("already-set");
    });
  });

  describe("RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES", () => {
    it("keeps enough headroom for noisy guarded OTA publish output", () => {
      expect(RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES).toBeGreaterThanOrEqual(64 * 1024 * 1024);
    });
  });

  describe("buildReleaseGuardOtaPublishCommand", () => {
    it("quotes spaced OTA messages safely for the Windows shell", () => {
      expect(
        buildReleaseGuardOtaPublishCommand({
          platform: "win32",
          channel: "production",
          message: 'TS: enable strictNullChecks phase 1',
        }),
      ).toBe('npx "eas" "update" "--branch" "production" "--message" "TS: enable strictNullChecks phase 1"');
    });

    it("quotes OTA messages safely for POSIX shells", () => {
      expect(
        buildReleaseGuardOtaPublishCommand({
          platform: "linux",
          channel: "preview",
          message: "Office owner's fallback",
        }),
      ).toBe("npx 'eas' 'update' '--branch' 'preview' '--message' 'Office owner'\\''s fallback'");
    });

    it("adds a guarded rollout percentage for per-update canaries", () => {
      expect(
        buildReleaseGuardOtaPublishCommand({
          platform: "win32",
          channel: "production",
          message: "Scale canary",
          rolloutPercentage: 5,
        }),
      ).toBe(
        'npx "eas" "update" "--branch" "production" "--message" "Scale canary" "--rollout-percentage" "5"',
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

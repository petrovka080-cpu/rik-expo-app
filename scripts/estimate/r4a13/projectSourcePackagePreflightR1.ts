import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  loadVerifiedProjectSourcePackageBinding,
  loadVerifiedProjectSourcePackageBindings,
  PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT,
  type ExpectedProjectSourcePackageMapping,
  type VerifiedProjectSourcePackageBinding,
} from "./projectSourcePackageBindingR1";

type Json = Record<string, unknown>;

export const PROJECT_SOURCE_PACKAGE_PREFLIGHT_CONTRACT =
  "rik-expo-app.s27-9.project-source-package-preflight-receipt.v1";

export const S279_PROJECT_SOURCE_PACKAGES_PREFLIGHT_CONTRACT =
  "rik-expo-app.s27-9.complete-project-source-packages-preflight-receipt.v1";

export const S279_ADDRESSABLE_SOURCE_KEY = "project_addressable_smoke_detector_package_v1";
export const S279_SPRINKLER_SOURCE_KEY = "project_sprinkler_head_connection_package_v1";
const ADDRESSABLE_ROW_ID = "rc09:addressable_smoke_detector_install";
const SPRINKLER_ROW_ID = "rc09:sprinkler_head_install";

export const S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS = Object.freeze({
  addressable: Object.freeze({
    sourceKey: S279_ADDRESSABLE_SOURCE_KEY,
    mappings: Object.freeze([
      Object.freeze({
        expectedCatalogId: "canonical-work:base:electrical_interior_fire_alarm_install_high_load",
        expectedDefinitionSha256: "5e1fa7291e172cfd9a56246847ae03d22d370188a3ddbd876b288232bf756ba1",
        expectedRowId: ADDRESSABLE_ROW_ID,
      }),
      Object.freeze({
        expectedCatalogId: "canonical-work:base:electrical_interior_fire_alarm_install_large_area",
        expectedDefinitionSha256: "6ac0a61a6bd350c39a728b7c676d1dae20019e19dbd7d01c2e431aa5ac9e85a8",
        expectedRowId: ADDRESSABLE_ROW_ID,
      }),
      Object.freeze({
        expectedCatalogId: "canonical-work:base:electrical_interior_fire_alarm_install_small_area",
        expectedDefinitionSha256: "8a27a956a044cdc9008eba64ce6352a4044ac83415c7c1c8b3b1430fc56d7109",
        expectedRowId: ADDRESSABLE_ROW_ID,
      }),
      Object.freeze({
        expectedCatalogId: "canonical-work:base:electrical_interior_fire_alarm_install_standard",
        expectedDefinitionSha256: "dd91b1e1e56fbb24603dcc345d6c4fdbcd3b266ab2a18fd70dccb7f4e8529fd6",
        expectedRowId: ADDRESSABLE_ROW_ID,
      }),
      Object.freeze({
        expectedCatalogId: "canonical-work:base:electrical_interior_fire_alarm_install_technical_room",
        expectedDefinitionSha256: "733e91770deab664bbdf3e281cd43608d979bffc3291884a0797ca38691623e1",
        expectedRowId: ADDRESSABLE_ROW_ID,
      }),
      Object.freeze({
        expectedCatalogId: "canonical-work:base:electrical_interior_fire_alarm_install_wet_zone",
        expectedDefinitionSha256: "b82276dc8a0ef97e2f744dca7fe5a5b5c74678a615d65e50e271b1ee2bae0a61",
        expectedRowId: ADDRESSABLE_ROW_ID,
      }),
    ] satisfies readonly ExpectedProjectSourcePackageMapping[]),
  }),
  sprinkler: Object.freeze({
    sourceKey: S279_SPRINKLER_SOURCE_KEY,
    mappings: Object.freeze([
      Object.freeze({
        expectedCatalogId: "canonical-work:expanded:sprinkler_system",
        expectedDefinitionSha256: "a521028ae9552f25868de12ad6f332c4f4ecc4ea5d5a2953b5447540d5333fda",
        expectedRowId: SPRINKLER_ROW_ID,
      }),
    ] satisfies readonly ExpectedProjectSourcePackageMapping[]),
  }),
});

export type ProjectSourcePackagePreflightInput = Readonly<{
  manifestPath: string;
  expectedSourceKey: string;
  expectedCatalogId: string;
  expectedDefinitionSha256: string;
  expectedRowId: string;
}>;

export type ProjectSourcePackagePreflightCliOptions = ProjectSourcePackagePreflightInput
  & Readonly<{ outputPath: string }>;

export type S279ProjectSourcePackagesPreflightInput = Readonly<{
  addressableManifestPath: string;
  sprinklerManifestPath: string;
}>;

export type S279ProjectSourcePackagesPreflightCliOptions =
  S279ProjectSourcePackagesPreflightInput & Readonly<{ outputPath: string }>;

export type S279ProjectSourcePackageRole = "ADDRESSABLE_FIRE_ALARM" | "SPRINKLER_SYSTEM";

export type S279VerifiedProjectSourcePackageSet = Readonly<{
  packageRole: S279ProjectSourcePackageRole;
  packageSetSha256: string;
  targetPackagePayloadSha256: string;
  verifiedPackageCount: number;
  verifiedMappingCount: number;
}>;

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function immutableJson<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((child) => immutableJson(child));
    return Object.freeze(value) as T;
  }
  if (value != null && typeof value === "object") {
    Object.values(value as Record<string, unknown>)
      .forEach((child) => immutableJson(child));
    return Object.freeze(value);
  }
  return value;
}

function locatorText(locator: Readonly<Json>, key: string): string {
  const value = locator[key];
  return typeof value === "string" ? value.trim() : "";
}

function requiredArgument(values: ReadonlyMap<string, string>, name: string): string {
  const value = values.get(name)?.trim() ?? "";
  if (!value) throw new Error(`PROJECT_SOURCE_PACKAGE_PREFLIGHT_ARGUMENT_REQUIRED:${name}`);
  return value;
}

export function parseProjectSourcePackagePreflightArgs(
  argv: readonly string[],
): ProjectSourcePackagePreflightCliOptions {
  const values = new Map<string, string>();
  for (const argument of argv) {
    const match = /^--([a-z0-9-]+)=(.*)$/u.exec(argument);
    if (match == null) throw new Error(`PROJECT_SOURCE_PACKAGE_PREFLIGHT_ARGUMENT_INVALID:${argument}`);
    const [, name, value] = match;
    if (values.has(name!)) throw new Error(`PROJECT_SOURCE_PACKAGE_PREFLIGHT_ARGUMENT_DUPLICATE:${name}`);
    values.set(name!, value!);
  }
  const allowed = new Set([
    "manifest",
    "source-key",
    "catalog-id",
    "definition-sha256",
    "row-id",
    "output",
  ]);
  for (const name of values.keys()) {
    if (!allowed.has(name)) throw new Error(`PROJECT_SOURCE_PACKAGE_PREFLIGHT_ARGUMENT_UNKNOWN:${name}`);
  }
  return {
    manifestPath: resolve(requiredArgument(values, "manifest")),
    expectedSourceKey: requiredArgument(values, "source-key"),
    expectedCatalogId: requiredArgument(values, "catalog-id"),
    expectedDefinitionSha256: requiredArgument(values, "definition-sha256"),
    expectedRowId: requiredArgument(values, "row-id"),
    outputPath: resolve(requiredArgument(values, "output")),
  };
}

export function parseS279ProjectSourcePackagesPreflightArgs(
  argv: readonly string[],
): S279ProjectSourcePackagesPreflightCliOptions {
  const values = new Map<string, string>();
  for (const argument of argv) {
    const match = /^--([a-z0-9-]+)=(.*)$/u.exec(argument);
    if (match == null) throw new Error(`S279_PROJECT_SOURCE_PREFLIGHT_ARGUMENT_INVALID:${argument}`);
    const [, name, value] = match;
    if (values.has(name!)) throw new Error(`S279_PROJECT_SOURCE_PREFLIGHT_ARGUMENT_DUPLICATE:${name}`);
    values.set(name!, value!);
  }
  const allowed = new Set(["addressable-manifest", "sprinkler-manifest", "output"]);
  for (const name of values.keys()) {
    if (!allowed.has(name)) throw new Error(`S279_PROJECT_SOURCE_PREFLIGHT_ARGUMENT_UNKNOWN:${name}`);
  }
  const requireBatchArgument = (name: string): string => {
    const value = values.get(name)?.trim() ?? "";
    if (!value) throw new Error(`S279_PROJECT_SOURCE_PREFLIGHT_ARGUMENT_REQUIRED:${name}`);
    return value;
  };
  return {
    addressableManifestPath: resolve(requireBatchArgument("addressable-manifest")),
    sprinklerManifestPath: resolve(requireBatchArgument("sprinkler-manifest")),
    outputPath: resolve(requireBatchArgument("output")),
  };
}

function assertCheckedAtUtc(checkedAtUtc: string): void {
  const checkedAtMs = Date.parse(checkedAtUtc);
  if (!Number.isFinite(checkedAtMs) || new Date(checkedAtMs).toISOString() !== checkedAtUtc) {
    throw new Error("PROJECT_SOURCE_PACKAGE_PREFLIGHT_CHECKED_AT_INVALID");
  }
}

function manifestReceipt(binding: VerifiedProjectSourcePackageBinding): Readonly<Json> {
  return Object.freeze({
    fileName: binding.manifestFileName,
    bytes: binding.manifestBytes,
    sha256: binding.manifestSha256,
    packagePayloadSha256: binding.packagePayloadSha256,
  });
}

function artifactReceipts(
  binding: VerifiedProjectSourcePackageBinding,
): readonly Readonly<Json>[] {
  return Object.freeze(binding.artifactReceipts.map((artifact) => Object.freeze({
      artifactId: artifact.artifactId,
      fileName: artifact.fileName,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
      documentNumber: artifact.documentNumber,
      revision: artifact.revision,
      documentDate: artifact.documentDate,
      approvalStatus: artifact.approvalStatus,
      approvalCount: artifact.approvedBy.length,
    })));
}

function bindingReceipt(binding: VerifiedProjectSourcePackageBinding): Readonly<Json> {
  return Object.freeze({
    packageId: binding.packageId,
    sourceKey: binding.sourceKey,
    artifactCount: binding.artifactReceipts.length,
    artifacts: artifactReceipts(binding),
    ...mappingReceipt(binding),
  });
}

function mappingReceipt(binding: VerifiedProjectSourcePackageBinding): Readonly<Json> {
  return Object.freeze({
    mappingPayloadSha256: binding.mappingPayloadSha256,
    locatorCount: binding.verifiedLocators.length,
    locators: binding.verifiedLocators.map((locator) => ({
      artifactId: locator.artifactId,
      excerptFileName: locator.excerptFileName,
      excerptBytes: locator.excerptBytes,
      excerptSha256: locator.excerptSha256,
      sheetOrPage: locatorText(locator.documentLocator, "sheetOrPage"),
      nodePositionOrClause: locatorText(locator.documentLocator, "nodePositionOrClause"),
      claimSupported: locatorText(locator.documentLocator, "claimSupported"),
      applicabilityBoundary: locatorText(locator.documentLocator, "applicabilityBoundary"),
    })),
  });
}

function s279ProjectIdentity(binding: VerifiedProjectSourcePackageBinding): Readonly<{
  objectName: string;
  projectCode: string;
  projectStage: string;
}> {
  return Object.freeze({
    objectName: locatorText(binding.projectMetadata, "objectName"),
    projectCode: locatorText(binding.projectMetadata, "projectCode"),
    projectStage: locatorText(binding.projectMetadata, "projectStage"),
  });
}

export function buildProjectSourcePackagePreflightReceipt(
  input: ProjectSourcePackagePreflightInput,
  checkedAtUtc = new Date().toISOString(),
): Readonly<Json> {
  assertCheckedAtUtc(checkedAtUtc);
  const binding = loadVerifiedProjectSourcePackageBinding(input);
  const receiptPayload: Json = {
    schemaVersion: PROJECT_SOURCE_PACKAGE_PREFLIGHT_CONTRACT,
    status: "GREEN_PROJECT_SOURCE_PACKAGE_PREFLIGHT",
    checkedAtUtc,
    bindingContract: PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT,
    expectedIdentity: {
      sourceKey: input.expectedSourceKey,
      catalogId: input.expectedCatalogId,
      definitionSha256: input.expectedDefinitionSha256.toLowerCase(),
      rowId: input.expectedRowId,
    },
    manifest: manifestReceipt(binding),
    verifiedBinding: bindingReceipt(binding),
    sideEffects: {
      databaseWrites: 0,
      mutationPerformed: false,
      activationPerformed: false,
      deployPerformed: false,
      productionAccessed: false,
    },
    fakeGreenClaimed: false,
  };
  return immutableJson({
    ...receiptPayload,
    receiptPayloadSha256: sha256(JSON.stringify(receiptPayload)),
  });
}

export function buildS279ProjectSourcePackagesPreflightReceipt(
  input: S279ProjectSourcePackagesPreflightInput,
  checkedAtUtc = new Date().toISOString(),
): Readonly<Json> {
  assertCheckedAtUtc(checkedAtUtc);
  const packageInputs = [
    {
      packageRole: "ADDRESSABLE_FIRE_ALARM",
      manifestPath: resolve(input.addressableManifestPath),
      expectation: S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
    },
    {
      packageRole: "SPRINKLER_SYSTEM",
      manifestPath: resolve(input.sprinklerManifestPath),
      expectation: S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.sprinkler,
    },
  ] as const;
  const verifiedPackages = packageInputs.map((packageInput) => {
    const bindings = loadVerifiedProjectSourcePackageBindings({
      manifestPath: packageInput.manifestPath,
      expectedSourceKey: packageInput.expectation.sourceKey,
      expectedMappings: packageInput.expectation.mappings,
    });
    const firstBinding = bindings[0]!;
    return {
      projectIdentity: s279ProjectIdentity(firstBinding),
      receipt: {
        packageRole: packageInput.packageRole,
        expectedSourceKey: packageInput.expectation.sourceKey,
        manifest: manifestReceipt(firstBinding),
        packageId: firstBinding.packageId,
        sourceKey: firstBinding.sourceKey,
        packagePayloadSha256: firstBinding.packagePayloadSha256,
        artifactCount: firstBinding.artifactReceipts.length,
        excerptCount: firstBinding.excerptReceipts.length,
        artifacts: artifactReceipts(firstBinding),
        mappingCount: bindings.length,
        mappings: bindings.map((binding, index) => ({
          expectedIdentity: {
            sourceKey: packageInput.expectation.sourceKey,
            catalogId: packageInput.expectation.mappings[index]!.expectedCatalogId,
            definitionSha256:
              packageInput.expectation.mappings[index]!.expectedDefinitionSha256.toLowerCase(),
            rowId: packageInput.expectation.mappings[index]!.expectedRowId,
          },
          ...mappingReceipt(binding),
        })),
      },
    };
  });
  const packageIds = verifiedPackages.map((item) => item.receipt.packageId);
  if (new Set(packageIds).size !== packageIds.length) {
    throw new Error("S279_PROJECT_SOURCE_PREFLIGHT_DUPLICATE_PACKAGE_ID");
  }
  const projectIdentity = verifiedPackages[0]!.projectIdentity;
  for (const item of verifiedPackages.slice(1)) {
    for (const key of ["objectName", "projectCode", "projectStage"] as const) {
      if (item.projectIdentity[key] !== projectIdentity[key]) {
        throw new Error(`S279_PROJECT_SOURCE_PREFLIGHT_PROJECT_IDENTITY_MISMATCH:${key}`);
      }
    }
  }
  const packages = verifiedPackages.map((item) => item.receipt);
  const expectedIdentities = packageInputs.flatMap((packageInput) =>
    packageInput.expectation.mappings.map((mapping) => ({
      sourceKey: packageInput.expectation.sourceKey,
      catalogId: mapping.expectedCatalogId,
      definitionSha256: mapping.expectedDefinitionSha256.toLowerCase(),
      rowId: mapping.expectedRowId,
    })));
  const verifiedMappingCount = packages.reduce((total, item) => total + item.mappingCount, 0);
  if (verifiedMappingCount !== expectedIdentities.length) {
    throw new Error("S279_PROJECT_SOURCE_PREFLIGHT_COVERAGE_CARDINALITY");
  }
  const receiptPayload: Json = {
    schemaVersion: S279_PROJECT_SOURCE_PACKAGES_PREFLIGHT_CONTRACT,
    status: "GREEN_S279_COMPLETE_PROJECT_SOURCE_PACKAGES_PREFLIGHT",
    checkedAtUtc,
    bindingContract: PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT,
    singlePackagePreflightContract: PROJECT_SOURCE_PACKAGE_PREFLIGHT_CONTRACT,
    coverage: {
      requiredPackageCount: 2,
      verifiedPackageCount: packages.length,
      requiredMappingCount: expectedIdentities.length,
      verifiedMappingCount,
      expectedIdentitiesSha256: sha256(JSON.stringify(expectedIdentities)),
      projectIdentitySha256: sha256(JSON.stringify(projectIdentity)),
    },
    packages,
    sideEffects: {
      databaseWrites: 0,
      mutationPerformed: false,
      activationPerformed: false,
      deployPerformed: false,
      productionAccessed: false,
    },
    humanAcceptanceCreated: 0,
    fakeGreenClaimed: false,
  };
  return immutableJson({
    ...receiptPayload,
    receiptPayloadSha256: sha256(JSON.stringify(receiptPayload)),
  });
}

function optionalManifestPath(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? resolve(trimmed) : null;
}

export function verifyS279CompleteProjectSourcePackageSetForSuccessor(input: Readonly<{
  packageRole: S279ProjectSourcePackageRole;
  targetManifestPath?: string;
  addressableManifestPath?: string;
  sprinklerManifestPath?: string;
}>): S279VerifiedProjectSourcePackageSet | null {
  const targetManifestPath = optionalManifestPath(input.targetManifestPath);
  const addressableManifestPath = optionalManifestPath(input.addressableManifestPath);
  const sprinklerManifestPath = optionalManifestPath(input.sprinklerManifestPath);
  if (targetManifestPath == null
    && addressableManifestPath == null
    && sprinklerManifestPath == null) return null;
  if (targetManifestPath == null
    || addressableManifestPath == null
    || sprinklerManifestPath == null) {
    throw new Error("S279_PROJECT_SOURCE_SUCCESSOR_PACKAGE_SET_INCOMPLETE");
  }
  const expectedTargetPath = input.packageRole === "ADDRESSABLE_FIRE_ALARM"
    ? addressableManifestPath
    : sprinklerManifestPath;
  if (targetManifestPath !== expectedTargetPath) {
    throw new Error("S279_PROJECT_SOURCE_SUCCESSOR_TARGET_MANIFEST_MISMATCH");
  }
  const receipt = buildS279ProjectSourcePackagesPreflightReceipt({
    addressableManifestPath,
    sprinklerManifestPath,
  });
  const coverage = receipt.coverage as Json;
  const packages = receipt.packages as Json[];
  const targetPackage = packages.find((candidate) => candidate.packageRole === input.packageRole);
  if (targetPackage == null) {
    throw new Error("S279_PROJECT_SOURCE_SUCCESSOR_TARGET_PACKAGE_MISSING");
  }
  const setPayload = {
    schemaVersion: S279_PROJECT_SOURCE_PACKAGES_PREFLIGHT_CONTRACT,
    bindingContract: PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT,
    coverage,
    packages,
  };
  return Object.freeze({
    packageRole: input.packageRole,
    packageSetSha256: sha256(JSON.stringify(setPayload)),
    targetPackagePayloadSha256: String(targetPackage.packagePayloadSha256),
    verifiedPackageCount: Number(coverage.verifiedPackageCount),
    verifiedMappingCount: Number(coverage.verifiedMappingCount),
  });
}

export function writeProjectSourcePackagePreflightReceipt(
  outputPath: string,
  receipt: Readonly<Json>,
): string {
  const resolvedOutputPath = resolve(outputPath);
  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  const pendingPath = `${resolvedOutputPath}.pending-${process.pid}`;
  writeFileSync(pendingPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  renameSync(pendingPath, resolvedOutputPath);
  return resolvedOutputPath;
}

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type ExpectedProjectSourcePackageMapping,
  loadVerifiedProjectSourcePackageBinding,
  PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT,
  projectSourcePackagePayloadSha256,
  validateProjectSourcePackageManifest,
} from "./projectSourcePackageBindingR1";
import {
  buildS279ProjectSourcePackagesPreflightReceipt,
  buildProjectSourcePackagePreflightReceipt,
  parseS279ProjectSourcePackagesPreflightArgs,
  parseProjectSourcePackagePreflightArgs,
  PROJECT_SOURCE_PACKAGE_PREFLIGHT_CONTRACT,
  S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS,
  S279_PROJECT_SOURCE_PACKAGES_PREFLIGHT_CONTRACT,
  verifyS279CompleteProjectSourcePackageSetForSuccessor,
  writeProjectSourcePackagePreflightReceipt,
} from "./projectSourcePackagePreflightR1";

const DEFINITION_SHA256 = "b".repeat(64);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function completeManifest(
  artifactBytes: Buffer,
  excerptBytes = Buffer.from("exact excerpt bytes", "utf8"),
) {
  const manifest: Record<string, unknown> = {
    schemaVersion: PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT,
    packageId: "approved-project-package-r1",
    sourceKey: "project_source_package_v1",
    project: {
      objectName: "Object A",
      projectCode: "PROJECT-A",
      projectStage: "WORKING_DOCUMENTATION",
      issuingOrganization: "Design organization",
      documentSetRevision: "R1",
      documentSetDate: "2026-09-27",
      approvalStatus: "APPROVED_FOR_USE",
      approvedBy: ["engineer-author", "chief-project-engineer"],
      applicabilityStatement: "Applicable to the mapped catalog definition and row.",
    },
    artifacts: [{
      artifactId: "schedule",
      file: "source/schedule.pdf",
      fileName: "schedule.pdf",
      bytes: artifactBytes.length,
      sha256: sha256(artifactBytes),
      documentNumber: "PROJECT-A-SCHEDULE-01",
      revision: "R1",
      documentDate: "2026-09-27",
      approvalStatus: "APPROVED_FOR_USE",
      approvedBy: ["engineer-author", "chief-project-engineer"],
    }],
    catalogMappings: [{
      catalogId: "canonical-work:test:project-source",
      definitionSha256: DEFINITION_SHA256,
      rowId: "row:installation",
      applicable: true,
      documentLocators: [{
        artifactId: "schedule",
        sheetOrPage: "sheet 2",
        nodePositionOrClause: "position D-17",
        claimSupported: "device quantity and installation scope",
        applicabilityBoundary: "mapped object and revision only",
        excerptFile: "source/schedule-sheet-2-position-d17.txt",
        excerptBytes: excerptBytes.length,
        excerptSha256: sha256(excerptBytes),
      }],
    }],
  };
  manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
  return manifest;
}

function writeExpectedPackage(
  packageRoot: string,
  expectation: Readonly<{
    sourceKey: string;
    mappings: readonly ExpectedProjectSourcePackageMapping[];
  }>,
): string {
  const artifactBytes = Buffer.from(`approved bytes:${expectation.sourceKey}`, "utf8");
  const excerptBytes = Buffer.from(`exact excerpt:${expectation.sourceKey}`, "utf8");
  const sourceDir = join(packageRoot, "source");
  const manifestPath = join(packageRoot, "manifest.json");
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(join(sourceDir, "schedule.pdf"), artifactBytes);
  writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
  const manifest = completeManifest(artifactBytes, excerptBytes);
  manifest.packageId = `approved-${expectation.sourceKey}`;
  manifest.sourceKey = expectation.sourceKey;
  const locator = ((manifest.catalogMappings as Record<string, unknown>[])[0]!
    .documentLocators as Record<string, unknown>[])[0]!;
  manifest.catalogMappings = expectation.mappings.map((mapping) => ({
    catalogId: mapping.expectedCatalogId,
    definitionSha256: mapping.expectedDefinitionSha256,
    rowId: mapping.expectedRowId,
    applicable: true,
    documentLocators: [{ ...locator }],
  }));
  manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

describe("project source package binding", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "project-source-package-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("verifies original bytes and every locator for the exact catalog/definition/row mapping", () => {
    const artifactBytes = Buffer.from("approved project source bytes", "utf8");
    const excerptBytes = Buffer.from("exact excerpt bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    const artifactPath = join(sourceDir, "schedule.pdf");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(artifactPath, artifactBytes);
    writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
    const manifest = completeManifest(artifactBytes, excerptBytes);
    const secondExcerptBytes = Buffer.from("second exact excerpt bytes", "utf8");
    writeFileSync(join(sourceDir, "schedule-sheet-4-note-9.txt"), secondExcerptBytes);
    const mapping = (manifest.catalogMappings as Record<string, unknown>[])[0]!;
    (mapping.documentLocators as Record<string, unknown>[]).push({
      artifactId: "schedule",
      sheetOrPage: "sheet 4",
      nodePositionOrClause: "note 9",
      claimSupported: "installation boundary",
      applicabilityBoundary: "mapped object and revision only",
      excerptFile: "source/schedule-sheet-4-note-9.txt",
      excerptBytes: secondExcerptBytes.length,
      excerptSha256: sha256(secondExcerptBytes),
    });
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const binding = loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    });

    expect(binding.packagePayloadSha256).toBe(manifest.packagePayloadSha256);
    expect(binding).toEqual(expect.objectContaining({
      manifestFileName: "manifest.json",
      manifestBytes: readFileSync(manifestPath).length,
      manifestSha256: sha256(readFileSync(manifestPath)),
    }));
    expect(binding.artifactReceipts).toEqual([expect.objectContaining({
      artifactId: "schedule",
      bytes: artifactBytes.length,
      sha256: sha256(artifactBytes),
    })]);
    expect(binding.mappingPayloadSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(binding.excerptReceipts).toEqual([expect.objectContaining({
      artifactId: "schedule",
      bytes: excerptBytes.length,
      sha256: sha256(excerptBytes),
    }), expect.objectContaining({
      artifactId: "schedule",
      bytes: secondExcerptBytes.length,
      sha256: sha256(secondExcerptBytes),
    })]);
    expect(binding.verifiedLocators).toEqual([expect.objectContaining({
      artifactId: "schedule",
      excerptBytes: excerptBytes.length,
      excerptSha256: sha256(excerptBytes),
    }), expect.objectContaining({
      artifactId: "schedule",
      excerptBytes: secondExcerptBytes.length,
      excerptSha256: sha256(secondExcerptBytes),
    })]);
    expect(binding.mapping).toEqual(expect.objectContaining({
      definitionSha256: DEFINITION_SHA256,
      applicable: true,
    }));
  });

  test("keeps all nested verified manifest evidence immutable after hash verification", () => {
    const artifactBytes = Buffer.from("approved project source bytes", "utf8");
    const excerptBytes = Buffer.from("exact excerpt bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "schedule.pdf"), artifactBytes);
    writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
    const manifest = completeManifest(artifactBytes, excerptBytes);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const binding = loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    });
    const approvedBy = binding.projectMetadata.approvedBy as unknown[];
    const documentLocators = binding.mapping.documentLocators as Record<string, unknown>[];

    expect(Object.isFrozen(binding.projectMetadata)).toBe(true);
    expect(Object.isFrozen(approvedBy)).toBe(true);
    expect(Object.isFrozen(binding.mapping)).toBe(true);
    expect(Object.isFrozen(documentLocators)).toBe(true);
    expect(Object.isFrozen(documentLocators[0])).toBe(true);
  });

  test("keeps each locator bound to its own artifact when verified excerpt bytes are shared", () => {
    const artifactBytes = Buffer.from("approved project source bytes", "utf8");
    const appendixBytes = Buffer.from("approved appendix bytes", "utf8");
    const excerptBytes = Buffer.from("shared exact excerpt bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "schedule.pdf"), artifactBytes);
    writeFileSync(join(sourceDir, "appendix.pdf"), appendixBytes);
    writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
    const manifest = completeManifest(artifactBytes, excerptBytes);
    (manifest.artifacts as Record<string, unknown>[]).push({
      artifactId: "appendix",
      file: "source/appendix.pdf",
      fileName: "appendix.pdf",
      bytes: appendixBytes.length,
      sha256: sha256(appendixBytes),
      documentNumber: "PROJECT-A-APPENDIX-01",
      revision: "R1",
      documentDate: "2026-09-27",
      approvalStatus: "APPROVED_FOR_USE",
      approvedBy: ["engineer-author", "chief-project-engineer"],
    });
    const mapping = (manifest.catalogMappings as Record<string, unknown>[])[0]!;
    (mapping.documentLocators as Record<string, unknown>[]).push({
      artifactId: "appendix",
      sheetOrPage: "appendix sheet 1",
      nodePositionOrClause: "reference D-17",
      claimSupported: "schedule applicability confirmation",
      applicabilityBoundary: "mapped object and revision only",
      excerptFile: "source/schedule-sheet-2-position-d17.txt",
      excerptBytes: excerptBytes.length,
      excerptSha256: sha256(excerptBytes),
    });
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const binding = loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    });

    expect(binding.verifiedLocators.map((locator) => locator.artifactId))
      .toEqual(["schedule", "appendix"]);
    expect(binding.excerptReceipts.map((receipt) => receipt.artifactId))
      .toEqual(["schedule", "appendix"]);
  });

  test("rejects two artifact ids that alias the same approved source file", () => {
    const artifactBytes = Buffer.from("approved project source bytes", "utf8");
    const excerptBytes = Buffer.from("exact excerpt bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "schedule.pdf"), artifactBytes);
    writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
    const manifest = completeManifest(artifactBytes, excerptBytes);
    (manifest.artifacts as Record<string, unknown>[]).push({
      artifactId: "schedule-alias",
      file: "source/schedule.pdf",
      fileName: "schedule.pdf",
      bytes: artifactBytes.length,
      sha256: sha256(artifactBytes),
      documentNumber: "PROJECT-A-SCHEDULE-ALIAS",
      revision: "R1",
      documentDate: "2026-09-27",
      approvalStatus: "APPROVED_FOR_USE",
      approvedBy: ["engineer-author", "chief-project-engineer"],
    });
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    expect(() => loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    })).toThrow("PROJECT_SOURCE_PACKAGE_DUPLICATE_ARTIFACT_FILE:schedule-alias");
  });

  test("rejects modified artifact bytes instead of trusting the manifest", () => {
    const original = Buffer.from("original bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "schedule.pdf"), Buffer.from("modified bytes", "utf8"));
    const manifest = completeManifest(original);
    writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");

    expect(() => loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    })).toThrow(/PROJECT_SOURCE_PACKAGE_(BYTES|SHA256)_MISMATCH/u);
  });

  test("rejects artifact paths outside the package directory", () => {
    const artifactBytes = Buffer.from("approved bytes", "utf8");
    const manifest = completeManifest(artifactBytes);
    (manifest.artifacts as Record<string, unknown>[])[0]!.file = "../schedule.pdf";
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
    const manifestPath = join(root, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");

    expect(() => loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    })).toThrow("PROJECT_SOURCE_PACKAGE_ARTIFACT_PATH_ESCAPE");
  });

  test("rejects missing approval, missing locators and stale definition identity", () => {
    const manifest = completeManifest(Buffer.from("approved bytes", "utf8"));
    (manifest.project as Record<string, unknown>).approvedBy = [];
    const mapping = (manifest.catalogMappings as Record<string, unknown>[])[0]!;
    mapping.documentLocators = [];
    mapping.definitionSha256 = "stale";
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);

    expect(validateProjectSourcePackageManifest(manifest)).toEqual(expect.arrayContaining([
      "PROJECT_APPROVED_BY",
      "MAPPING_0_DEFINITION_SHA256",
      "MAPPING_0_LOCATORS_EMPTY",
    ]));
  });

  test("rejects impossible calendar dates and duplicated approval identities", () => {
    const manifest = completeManifest(Buffer.from("approved bytes", "utf8"));
    const project = manifest.project as Record<string, unknown>;
    const artifact = (manifest.artifacts as Record<string, unknown>[])[0]!;
    project.documentSetDate = "2026-02-30";
    project.approvedBy = ["chief-project-engineer", " chief-project-engineer "];
    artifact.documentDate = "2026-13-01";
    artifact.approvedBy = ["engineer-author", "engineer-author"];
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);

    expect(validateProjectSourcePackageManifest(manifest)).toEqual(expect.arrayContaining([
      "PROJECT_DOCUMENT_SET_DATE",
      "PROJECT_APPROVED_BY_DUPLICATE",
      "ARTIFACT_0_DOCUMENT_DATE",
      "ARTIFACT_0_APPROVED_BY_DUPLICATE",
    ]));
  });

  test("rejects approval identities duplicated only by Unicode form and letter case", () => {
    const manifest = completeManifest(Buffer.from("approved bytes", "utf8"));
    const project = manifest.project as Record<string, unknown>;
    const artifact = (manifest.artifacts as Record<string, unknown>[])[0]!;
    project.approvedBy = ["Chief-Project-Engineer", " chief-project-engineer "];
    artifact.approvedBy = ["Engineer-Author", "ＥＮＧＩＮＥＥＲ－ＡＵＴＨＯＲ"];
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);

    expect(validateProjectSourcePackageManifest(manifest)).toEqual(expect.arrayContaining([
      "PROJECT_APPROVED_BY_DUPLICATE",
      "ARTIFACT_0_APPROVED_BY_DUPLICATE",
    ]));
  });

  test("rejects coerced byte counts and canonically duplicated locators", () => {
    const manifest = completeManifest(Buffer.from("approved bytes", "utf8"));
    const artifact = (manifest.artifacts as Record<string, unknown>[])[0]!;
    const mapping = (manifest.catalogMappings as Record<string, unknown>[])[0]!;
    const locators = mapping.documentLocators as Record<string, unknown>[];
    artifact.bytes = String(artifact.bytes);
    locators[0]!.excerptBytes = true;
    locators.push(Object.fromEntries(Object.entries(locators[0]!).map(([key, value]) => [
      key,
      typeof value === "string" ? ` ${value} ` : value,
    ])));
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);

    expect(validateProjectSourcePackageManifest(manifest)).toEqual(expect.arrayContaining([
      "ARTIFACT_0_BYTES",
      "MAPPING_0_LOCATOR_0_EXCERPT_BYTES",
      "MAPPING_0_LOCATOR_1_DUPLICATE",
      "MAPPING_0_LOCATOR_1_EXCERPT_BYTES",
    ]));
  });

  test("rejects a changed manifest payload with a stale package hash", () => {
    const manifest = completeManifest(Buffer.from("approved bytes", "utf8"));
    (manifest.project as Record<string, unknown>).projectStage = "CHANGED_AFTER_HASH";
    expect(validateProjectSourcePackageManifest(manifest))
      .toContain("PACKAGE_PAYLOAD_SHA256_MISMATCH");
  });

  test("rejects a duplicated locator instead of overstating source coverage", () => {
    const manifest = completeManifest(Buffer.from("approved bytes", "utf8"));
    const mapping = (manifest.catalogMappings as Record<string, unknown>[])[0]!;
    const locators = mapping.documentLocators as Record<string, unknown>[];
    locators.push({ ...locators[0] });
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);

    expect(validateProjectSourcePackageManifest(manifest)).toContain("MAPPING_0_LOCATOR_1_DUPLICATE");
  });

  test("rejects a duplicated locator hidden behind an excerpt path alias", () => {
    const artifactBytes = Buffer.from("approved project source bytes", "utf8");
    const excerptBytes = Buffer.from("exact excerpt bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "schedule.pdf"), artifactBytes);
    writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
    const manifest = completeManifest(artifactBytes, excerptBytes);
    const mapping = (manifest.catalogMappings as Record<string, unknown>[])[0]!;
    const locators = mapping.documentLocators as Record<string, unknown>[];
    locators.push({
      ...locators[0],
      excerptFile: "source/./schedule-sheet-2-position-d17.txt",
    });
    manifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(manifest);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    expect(() => loadVerifiedProjectSourcePackageBinding({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    })).toThrow(
      "PROJECT_SOURCE_PACKAGE_DUPLICATE_LOCATOR_FILE_ALIAS:canonical-work:test:project-source:row:installation",
    );
  });

  test("writes a read-only terminal preflight receipt without approver identities", () => {
    const artifactBytes = Buffer.from("approved project source bytes", "utf8");
    const excerptBytes = Buffer.from("exact excerpt bytes", "utf8");
    const sourceDir = join(root, "source");
    const manifestPath = join(root, "manifest.json");
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "schedule.pdf"), artifactBytes);
    writeFileSync(join(sourceDir, "schedule-sheet-2-position-d17.txt"), excerptBytes);
    const manifest = completeManifest(artifactBytes, excerptBytes);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const receipt = buildProjectSourcePackagePreflightReceipt({
      manifestPath,
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
    }, "2026-09-27T12:00:00.000Z");
    const receiptPath = writeProjectSourcePackagePreflightReceipt(join(root, "receipt.json"), receipt);
    const savedReceipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
    const savedText = JSON.stringify(savedReceipt);

    expect(savedReceipt).toEqual(expect.objectContaining({
      schemaVersion: PROJECT_SOURCE_PACKAGE_PREFLIGHT_CONTRACT,
      status: "GREEN_PROJECT_SOURCE_PACKAGE_PREFLIGHT",
      checkedAtUtc: "2026-09-27T12:00:00.000Z",
      sideEffects: {
        databaseWrites: 0,
        mutationPerformed: false,
        activationPerformed: false,
        deployPerformed: false,
        productionAccessed: false,
      },
      fakeGreenClaimed: false,
      receiptPayloadSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    }));
    expect(savedText).not.toContain("engineer-author");
    expect(savedText).not.toContain("chief-project-engineer");

    const expectedIdentity = receipt.expectedIdentity as Record<string, unknown>;
    const sideEffects = receipt.sideEffects as Record<string, unknown>;
    const verifiedBinding = receipt.verifiedBinding as Record<string, unknown>;
    const locators = verifiedBinding.locators as Record<string, unknown>[];
    const receiptBeforeMutationAttempt = JSON.stringify(receipt);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(expectedIdentity)).toBe(true);
    expect(Object.isFrozen(sideEffects)).toBe(true);
    expect(Object.isFrozen(verifiedBinding)).toBe(true);
    expect(Object.isFrozen(locators)).toBe(true);
    expect(Object.isFrozen(locators[0])).toBe(true);
    expect(Reflect.set(sideEffects, "databaseWrites", 1)).toBe(false);
    expect(JSON.stringify(receipt)).toBe(receiptBeforeMutationAttempt);
  });

  test("parses an explicit preflight command and rejects ambiguous arguments", () => {
    const options = parseProjectSourcePackagePreflightArgs([
      `--manifest=${join(root, "manifest.json")}`,
      "--source-key=project_source_package_v1",
      "--catalog-id=canonical-work:test:project-source",
      `--definition-sha256=${DEFINITION_SHA256}`,
      "--row-id=row:installation",
      `--output=${join(root, "receipt.json")}`,
    ]);

    expect(options).toEqual({
      manifestPath: join(root, "manifest.json"),
      expectedSourceKey: "project_source_package_v1",
      expectedCatalogId: "canonical-work:test:project-source",
      expectedDefinitionSha256: DEFINITION_SHA256,
      expectedRowId: "row:installation",
      outputPath: join(root, "receipt.json"),
    });
    expect(() => parseProjectSourcePackagePreflightArgs([
      "--manifest=one.json",
      "--manifest=two.json",
    ])).toThrow("PROJECT_SOURCE_PACKAGE_PREFLIGHT_ARGUMENT_DUPLICATE:manifest");
    expect(() => parseProjectSourcePackagePreflightArgs([
      "--unsupported=value",
    ])).toThrow("PROJECT_SOURCE_PACKAGE_PREFLIGHT_ARGUMENT_UNKNOWN:unsupported");
  });

  test("verifies both S27.9 packages and the complete immutable 6+1 mapping set", () => {
    const addressableManifestPath = writeExpectedPackage(
      join(root, "addressable"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
    );
    const sprinklerManifestPath = writeExpectedPackage(
      join(root, "sprinkler"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.sprinkler,
    );

    const receipt = buildS279ProjectSourcePackagesPreflightReceipt({
      addressableManifestPath,
      sprinklerManifestPath,
    }, "2026-09-27T14:00:00.000Z");
    const receiptText = JSON.stringify(receipt);

    expect(receipt).toEqual(expect.objectContaining({
      schemaVersion: S279_PROJECT_SOURCE_PACKAGES_PREFLIGHT_CONTRACT,
      status: "GREEN_S279_COMPLETE_PROJECT_SOURCE_PACKAGES_PREFLIGHT",
      coverage: expect.objectContaining({
        requiredPackageCount: 2,
        verifiedPackageCount: 2,
        requiredMappingCount: 7,
        verifiedMappingCount: 7,
        expectedIdentitiesSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
        projectIdentitySha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      }),
      sideEffects: {
        databaseWrites: 0,
        mutationPerformed: false,
        activationPerformed: false,
        deployPerformed: false,
        productionAccessed: false,
      },
      humanAcceptanceCreated: 0,
      fakeGreenClaimed: false,
      receiptPayloadSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    }));
    expect((receipt.packages as Record<string, unknown>[]).map((item) => item.mappingCount))
      .toEqual([6, 1]);
    expect(receiptText).not.toContain("engineer-author");
    expect(receiptText).not.toContain("chief-project-engineer");

    const coverage = receipt.coverage as Record<string, unknown>;
    const packages = receipt.packages as Record<string, unknown>[];
    const mappings = packages[0]!.mappings as Record<string, unknown>[];
    const locators = mappings[0]!.locators as Record<string, unknown>[];
    const receiptBeforeMutationAttempt = JSON.stringify(receipt);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(coverage)).toBe(true);
    expect(Object.isFrozen(packages)).toBe(true);
    expect(Object.isFrozen(packages[0])).toBe(true);
    expect(Object.isFrozen(mappings)).toBe(true);
    expect(Object.isFrozen(mappings[0])).toBe(true);
    expect(Object.isFrozen(locators)).toBe(true);
    expect(Object.isFrozen(locators[0])).toBe(true);
    expect(Reflect.set(coverage, "verifiedMappingCount", 0)).toBe(false);
    expect(JSON.stringify(receipt)).toBe(receiptBeforeMutationAttempt);

    const addressableSet = verifyS279CompleteProjectSourcePackageSetForSuccessor({
      packageRole: "ADDRESSABLE_FIRE_ALARM",
      targetManifestPath: addressableManifestPath,
      addressableManifestPath,
      sprinklerManifestPath,
    });
    const sprinklerSet = verifyS279CompleteProjectSourcePackageSetForSuccessor({
      packageRole: "SPRINKLER_SYSTEM",
      targetManifestPath: sprinklerManifestPath,
      addressableManifestPath,
      sprinklerManifestPath,
    });
    expect(addressableSet).toEqual(expect.objectContaining({
      packageRole: "ADDRESSABLE_FIRE_ALARM",
      packageSetSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      targetPackagePayloadSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      verifiedPackageCount: 2,
      verifiedMappingCount: 7,
    }));
    expect(sprinklerSet?.packageSetSha256).toBe(addressableSet?.packageSetSha256);
    expect(sprinklerSet?.targetPackagePayloadSha256)
      .not.toBe(addressableSet?.targetPackagePayloadSha256);
  });

  test("requires the complete S27.9 package pair at the successor write boundary", () => {
    const addressableManifestPath = writeExpectedPackage(
      join(root, "addressable"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
    );
    const sprinklerManifestPath = writeExpectedPackage(
      join(root, "sprinkler"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.sprinkler,
    );

    expect(() => verifyS279CompleteProjectSourcePackageSetForSuccessor({
      packageRole: "ADDRESSABLE_FIRE_ALARM",
      targetManifestPath: addressableManifestPath,
      addressableManifestPath,
    })).toThrow("S279_PROJECT_SOURCE_SUCCESSOR_PACKAGE_SET_INCOMPLETE");
    expect(() => verifyS279CompleteProjectSourcePackageSetForSuccessor({
      packageRole: "SPRINKLER_SYSTEM",
      targetManifestPath: addressableManifestPath,
      addressableManifestPath,
      sprinklerManifestPath,
    })).toThrow("S279_PROJECT_SOURCE_SUCCESSOR_TARGET_MANIFEST_MISMATCH");

    const successorSource = readFileSync(
      join(__dirname, "prepareMasterSingleDefinitionSuccessorR1.ts"),
      "utf8",
    );
    const setGuardIndex = successorSource.indexOf(
      "verifyS279CompleteProjectSourcePackageSetForSuccessor({",
    );
    expect(setGuardIndex).toBeGreaterThan(0);
    expect(setGuardIndex).toBeLessThan(successorSource.indexOf("const client = new Client"));
    expect(successorSource).toMatch(/fingerprint = sha256\(\{[\s\S]*projectSourcePackageSet,/u);
    expect(successorSource).toMatch(
      /projectSourcePackage: \{[\s\S]*completePackageSet: projectSourcePackageSet,[\s\S]*artifactReceipts:/u,
    );
  });

  test("rejects partial S27.9 package coverage instead of reporting a local 6/7 GREEN", () => {
    const incompleteAddressableExpectation = {
      ...S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
      mappings: S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable.mappings.slice(0, 5),
    };
    const addressableManifestPath = writeExpectedPackage(
      join(root, "addressable"),
      incompleteAddressableExpectation,
    );
    const sprinklerManifestPath = writeExpectedPackage(
      join(root, "sprinkler"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.sprinkler,
    );

    expect(() => buildS279ProjectSourcePackagesPreflightReceipt({
      addressableManifestPath,
      sprinklerManifestPath,
    }, "2026-09-27T14:00:00.000Z"))
      .toThrow("PROJECT_SOURCE_PACKAGE_MAPPING_CARDINALITY");
  });

  test("rejects cross-package substitution by the pinned source identity", () => {
    const addressableManifestPath = writeExpectedPackage(
      join(root, "addressable"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
    );

    expect(() => buildS279ProjectSourcePackagesPreflightReceipt({
      addressableManifestPath,
      sprinklerManifestPath: addressableManifestPath,
    }, "2026-09-27T14:00:00.000Z"))
      .toThrow("PROJECT_SOURCE_PACKAGE_SOURCE_KEY_MISMATCH");
  });

  test("rejects packages from different object-specific project identities", () => {
    const addressableManifestPath = writeExpectedPackage(
      join(root, "addressable"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
    );
    const sprinklerManifestPath = writeExpectedPackage(
      join(root, "sprinkler"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.sprinkler,
    );
    const sprinklerManifest = JSON.parse(
      readFileSync(sprinklerManifestPath, "utf8"),
    ) as Record<string, unknown>;
    (sprinklerManifest.project as Record<string, unknown>).projectCode = "PROJECT-B";
    sprinklerManifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(sprinklerManifest);
    writeFileSync(sprinklerManifestPath, `${JSON.stringify(sprinklerManifest, null, 2)}\n`, "utf8");

    expect(() => buildS279ProjectSourcePackagesPreflightReceipt({
      addressableManifestPath,
      sprinklerManifestPath,
    }, "2026-09-27T14:00:00.000Z"))
      .toThrow("S279_PROJECT_SOURCE_PREFLIGHT_PROJECT_IDENTITY_MISMATCH:projectCode");
  });

  test("rejects reuse of one package identity for both required source roles", () => {
    const addressableManifestPath = writeExpectedPackage(
      join(root, "addressable"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.addressable,
    );
    const sprinklerManifestPath = writeExpectedPackage(
      join(root, "sprinkler"),
      S279_PROJECT_SOURCE_PACKAGE_EXPECTATIONS.sprinkler,
    );
    const addressableManifest = JSON.parse(
      readFileSync(addressableManifestPath, "utf8"),
    ) as Record<string, unknown>;
    const sprinklerManifest = JSON.parse(
      readFileSync(sprinklerManifestPath, "utf8"),
    ) as Record<string, unknown>;
    sprinklerManifest.packageId = addressableManifest.packageId;
    sprinklerManifest.packagePayloadSha256 = projectSourcePackagePayloadSha256(sprinklerManifest);
    writeFileSync(sprinklerManifestPath, `${JSON.stringify(sprinklerManifest, null, 2)}\n`, "utf8");

    expect(() => buildS279ProjectSourcePackagesPreflightReceipt({
      addressableManifestPath,
      sprinklerManifestPath,
    }, "2026-09-27T14:00:00.000Z"))
      .toThrow("S279_PROJECT_SOURCE_PREFLIGHT_DUPLICATE_PACKAGE_ID");
  });

  test("parses the two-package S27.9 preflight command without implicit paths", () => {
    const options = parseS279ProjectSourcePackagesPreflightArgs([
      `--addressable-manifest=${join(root, "addressable", "manifest.json")}`,
      `--sprinkler-manifest=${join(root, "sprinkler", "manifest.json")}`,
      `--output=${join(root, "receipt.json")}`,
    ]);

    expect(options).toEqual({
      addressableManifestPath: join(root, "addressable", "manifest.json"),
      sprinklerManifestPath: join(root, "sprinkler", "manifest.json"),
      outputPath: join(root, "receipt.json"),
    });
    expect(() => parseS279ProjectSourcePackagesPreflightArgs([
      "--addressable-manifest=one.json",
      "--addressable-manifest=two.json",
    ])).toThrow("S279_PROJECT_SOURCE_PREFLIGHT_ARGUMENT_DUPLICATE:addressable-manifest");
    expect(() => parseS279ProjectSourcePackagesPreflightArgs([
      "--manifest=unsupported.json",
    ])).toThrow("S279_PROJECT_SOURCE_PREFLIGHT_ARGUMENT_UNKNOWN:manifest");
  });
});

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  contentAddressedCachePath,
  loadRequiredArtifactManifest,
  prepareRequiredArtifacts,
  verifyPreparedArtifactsImmutable,
  type RequiredArtifactManifest,
} from "../../scripts/verification/requiredArtifactPreflight";

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function manifestFor(content: Buffer): RequiredArtifactManifest {
  const body = {
    schema: "verification-required-artifacts:v1" as const,
    manifest_version: 1 as const,
    source_attestation: { fixture: true },
    generated_at_excluded_from_content_hash: true as const,
    entries: [
      {
        path: "artifacts/fixture/matrix.json",
        content_type: "application/json" as const,
        schema_version: "fixture:v1",
        content_sha256: sha256(content),
        bytes: content.byteLength,
        input_fingerprint: "fixture-input-v1",
        producer: {
          producer_id: "fixture-producer-v1",
          owner: "tests/releasePipeline/requiredArtifactPreflight.contract.test.ts",
          command: null,
          version: "1",
          deterministic: false,
        },
        retention_policy: "test-only",
        required_by_gates: ["full-jest"],
      },
    ],
  };
  return {
    ...body,
    generated_at: "2026-08-03T00:00:00.000Z",
    content_sha256: sha256(JSON.stringify(body)),
  };
}

function writeManifest(root: string, manifest: RequiredArtifactManifest): string {
  const manifestPath = path.join(root, "required-artifacts.manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

describe("Verification V1 required-artifact preflight", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      for (const file of fs.existsSync(root) ? fs.readdirSync(root, { recursive: true }) : []) {
        const absolutePath = path.join(root, String(file));
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) fs.chmodSync(absolutePath, 0o666);
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function fixtureRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "rik-required-artifacts-"));
    roots.push(root);
    return root;
  }

  it("hydrates only an exact content-addressed blob and seals it read-only", () => {
    const root = fixtureRoot();
    const cacheRoot = path.join(root, "cache");
    const content = Buffer.from('{"status":"GREEN_FIXTURE"}\n', "utf8");
    const manifestPath = writeManifest(root, manifestFor(content));
    const cachePath = contentAddressedCachePath(cacheRoot, sha256(content));
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, content);

    const report = prepareRequiredArtifacts({
      root,
      manifestPath,
      cacheRoot,
      reportPath: path.join(root, "runtime", "preflight.json"),
      subjectSha: "a".repeat(40),
    });

    expect(report.final_status).toBe("GREEN_REQUIRED_ARTIFACT_PREFLIGHT_READY");
    expect(report.cache_hits).toBe(1);
    expect(report.prepared_artifacts).toBe(1);
    expect(report.artifacts[0]).toMatchObject({
      source: "content-addressed-cache",
      cache_reason: "cache-hit",
      read_only: true,
    });
    expect(
      verifyPreparedArtifactsImmutable({ root, manifestPath, preflight: report }),
    ).toMatchObject({ immutable: true, changed: [] });
  });

  it("rejects stale destination content instead of overwriting it", () => {
    const root = fixtureRoot();
    const cacheRoot = path.join(root, "cache");
    const content = Buffer.from('{"status":"GREEN_FIXTURE"}\n', "utf8");
    const manifestPath = writeManifest(root, manifestFor(content));
    const destination = path.join(root, "artifacts", "fixture", "matrix.json");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, '{"status":"STALE"}\n', "utf8");

    expect(() =>
      prepareRequiredArtifacts({
        root,
        manifestPath,
        cacheRoot,
        reportPath: path.join(root, "runtime", "preflight.json"),
        subjectSha: "b".repeat(40),
      }),
    ).toThrow(/destination_stale_or_mismatched/);
    expect(fs.readFileSync(destination, "utf8")).toBe('{"status":"STALE"}\n');
  });

  it("fails fast on a cache miss without a deterministic canonical producer", () => {
    const root = fixtureRoot();
    const content = Buffer.from('{"status":"GREEN_FIXTURE"}\n', "utf8");
    const manifestPath = writeManifest(root, manifestFor(content));
    const reportPath = path.join(root, "runtime", "preflight.json");

    expect(() =>
      prepareRequiredArtifacts({
        root,
        manifestPath,
        cacheRoot: path.join(root, "empty-cache"),
        reportPath,
        subjectSha: "c".repeat(40),
      }),
    ).toThrow(/cache_miss/);
    expect(JSON.parse(fs.readFileSync(reportPath, "utf8"))).toMatchObject({
      final_status: "STOP_REQUIRED_ARTIFACT_PREFLIGHT",
      prepared_artifacts: 0,
      exit_code: 1,
      fake_green_claimed: false,
    });
  });

  it("rejects manifest tampering through its content hash", () => {
    const root = fixtureRoot();
    const content = Buffer.from('{"status":"GREEN_FIXTURE"}\n', "utf8");
    const manifest = manifestFor(content);
    manifest.entries[0].bytes += 1;
    const manifestPath = writeManifest(root, manifest);

    expect(() => loadRequiredArtifactManifest(manifestPath)).toThrow(
      "required_artifact_manifest_content_hash_mismatch",
    );
  });
});

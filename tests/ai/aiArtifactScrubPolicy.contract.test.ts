import {
  AI_ARTIFACT_SCRUB_REDACTION_MARKER,
  scanAiArtifactSourceForUnsafePayloads,
  scanAiArtifactValueForUnsafePayloads,
  scrubAiArtifactValue,
  verifyAiArtifactScrubPolicy,
} from "../../src/features/ai/observability/aiArtifactScrubPolicy";

describe("AI artifact scrub policy", () => {
  it("allows explicit safe guard fields and budget limits", () => {
    const findings = scanAiArtifactValueForUnsafePayloads({
      artifactPath: "artifacts/safe.json",
      value: {
        no_raw_provider_payloads: true,
        rawProviderPayloadExposed: false,
        raw_provider_payload_storage_allowed: false,
        max_provider_payload_bytes: 4096,
      },
    });

    expect(findings).toEqual([]);
  });

  it("flags raw provider payload keys and credential-like strings", () => {
    const findings = scanAiArtifactValueForUnsafePayloads({
      artifactPath: "artifacts/unsafe.json",
      value: {
        rawProviderPayload: {
          authorization: "Bearer unsafe-token",
        },
      },
    });

    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["forbidden_artifact_key", "sensitive_artifact_string"]),
    );
  });

  it("redacts unsafe values without preserving credential text", () => {
    const scrubbed = scrubAiArtifactValue({
      safe: "ok",
      providerPayload: {
        token: "Bearer unsafe-token",
      },
    });

    expect(scrubbed).toMatchObject({
      safe: "ok",
      providerPayload: AI_ARTIFACT_SCRUB_REDACTION_MARKER,
    });
    expect(JSON.stringify(scrubbed)).not.toContain("unsafe-token");
  });

  it("verifies JSON artifacts and rejects invalid JSON", () => {
    const safe = verifyAiArtifactScrubPolicy({
      artifacts: [
        {
          artifactPath: "artifacts/safe.json",
          source: JSON.stringify({ no_raw_prompts: true, rawPromptExposed: false }),
        },
      ],
    });
    const invalid = scanAiArtifactSourceForUnsafePayloads({
      artifactPath: "artifacts/bad.json",
      source: "{",
    });

    expect(safe.safeForCommit).toBe(true);
    expect(invalid).toMatchObject([{ code: "artifact_json_parse_failed" }]);
  });
});

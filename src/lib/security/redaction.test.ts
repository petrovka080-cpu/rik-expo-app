import {
  SENSITIVE_REDACTION_MARKER,
  redactSensitiveRecord,
  redactSensitiveText,
  redactSensitiveValue,
} from "./redaction";

describe("security redaction", () => {
  it("redacts signed URL query secrets while preserving diagnostic shape", () => {
    const redacted = redactSensitiveText(
      "https://storage.example.test/report.pdf?token=secret-token&download=1&X-Amz-Signature=aws-secret",
    );

    expect(redacted).toContain("https://storage.example.test/report.pdf");
    expect(redacted).toContain(`token=${SENSITIVE_REDACTION_MARKER}`);
    expect(redacted).toContain("download=1");
    expect(redacted).toContain(`X-Amz-Signature=${SENSITIVE_REDACTION_MARKER}`);
    expect(redacted).not.toContain("secret-token");
    expect(redacted).not.toContain("aws-secret");
  });

  it("redacts bearer tokens and jwt-like values in free-form text", () => {
    const redacted = redactSensitiveText(
      "Authorization: Bearer abc.def-123 and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
    );

    expect(redacted).toContain(`Bearer ${SENSITIVE_REDACTION_MARKER}`);
    expect(redacted).not.toContain("abc.def-123");
    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("redacts email, phone, and obvious address PII in free-form text", () => {
    const redacted = redactSensitiveText(
      "Contact person@example.test at +996 555 123 456 or 123 Main Street before retry.",
    );

    expect(redacted).not.toContain("person@example.test");
    expect(redacted).not.toContain("+996 555 123 456");
    expect(redacted).not.toContain("123 Main Street");
    expect(redacted).toContain(SENSITIVE_REDACTION_MARKER);
  });

  it("redacts sensitive object keys recursively without mutating safe metadata", () => {
    const value = {
      signedUrl: "https://storage.example.test/report.pdf?token=secret",
      href: "/pdf-viewer?sessionId=session-1&openToken=open-secret",
      email: "person@example.test",
      phone: "+996 555 123 456",
      nested: {
        Authorization: "Bearer nested-secret",
        rows: [{ uri: "https://storage.example.test/file.pdf?access_token=access-secret" }],
      },
      safeCount: 3,
    };

    const redacted = redactSensitiveRecord(value);

    expect(redacted).toMatchObject({
      signedUrl: SENSITIVE_REDACTION_MARKER,
      href: `/pdf-viewer?sessionId=session-1&openToken=${SENSITIVE_REDACTION_MARKER}`,
      nested: {
        Authorization: SENSITIVE_REDACTION_MARKER,
        rows: [
          {
            uri: `https://storage.example.test/file.pdf?access_token=${SENSITIVE_REDACTION_MARKER}`,
          },
        ],
      },
      safeCount: 3,
    });
    expect(JSON.stringify(redacted)).not.toContain("secret");
    expect(JSON.stringify(redacted)).not.toContain("person@example.test");
    expect(JSON.stringify(redacted)).not.toContain("+996 555 123 456");
  });

  it("returns redacted Error instances for console-compatible diagnostics", () => {
    const redacted = redactSensitiveValue(
      new TypeError("failed with https://storage.example.test/file.pdf?token=secret"),
    );

    expect(redacted).toBeInstanceOf(Error);
    expect((redacted as Error).name).toBe("TypeError");
    expect((redacted as Error).message).toContain(`token=${SENSITIVE_REDACTION_MARKER}`);
    expect((redacted as Error).message).not.toContain("secret");
  });
});

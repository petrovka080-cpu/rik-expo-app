import {
  getPlatformObservabilityEvents,
  recordPlatformObservability,
  resetPlatformObservabilityEvents,
} from "./platformObservability";
import { SENSITIVE_REDACTION_MARKER } from "../security/redaction";

describe("platform observability redaction", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("stores diagnostic events without signed URL or token secrets", () => {
    recordPlatformObservability({
      screen: "pdf_viewer",
      surface: "signed_url_redaction",
      category: "fetch",
      event: "signed_url_received",
      result: "error",
      errorMessage: "failed https://storage.example.test/file.pdf?token=error-secret",
      extra: {
        signedUrl: "https://storage.example.test/file.pdf?token=signed-secret",
        href: "/pdf-viewer?sessionId=session-1&openToken=open-secret",
        nested: {
          Authorization: "Bearer bearer-secret",
          remoteUrl: "https://storage.example.test/remote.pdf?access_token=access-secret",
        },
      },
    });

    const events = getPlatformObservabilityEvents();
    const stored = events[0];
    const storedJson = JSON.stringify(stored);

    expect(stored.errorMessage).toContain(`token=${SENSITIVE_REDACTION_MARKER}`);
    expect(stored.extra).toMatchObject({
      signedUrl: SENSITIVE_REDACTION_MARKER,
      href: `/pdf-viewer?sessionId=session-1&openToken=${SENSITIVE_REDACTION_MARKER}`,
      nested: {
        Authorization: SENSITIVE_REDACTION_MARKER,
        remoteUrl: `https://storage.example.test/remote.pdf?access_token=${SENSITIVE_REDACTION_MARKER}`,
      },
    });
    expect(storedJson).not.toContain("error-secret");
    expect(storedJson).not.toContain("signed-secret");
    expect(storedJson).not.toContain("open-secret");
    expect(storedJson).not.toContain("bearer-secret");
    expect(storedJson).not.toContain("access-secret");
  });
});

import {
  applyBuyerDraftAttachmentSelection,
} from "../../src/screens/buyer/hooks/useBuyerInboxRenderers";
import {
  buildBuyerRfqPrefillPatch,
  resolveBuyerRfqPrefillBoundary,
} from "../../src/screens/buyer/hooks/useBuyerRfqPrefill";

describe("STRICT_NULLCHECKS_PHASE_9 buyer owner boundary", () => {
  it("removes null attachment picks instead of storing a false-ready null entry", () => {
    const prev = {
      acme: {
        name: "quote.pdf",
        file: { name: "quote.pdf", uri: "file:///quote.pdf" },
      },
      beta: {
        name: "beta.pdf",
        file: { name: "beta.pdf", uri: "file:///beta.pdf" },
      },
    };

    const next = applyBuyerDraftAttachmentSelection(prev, "acme", null);

    expect(next).toEqual({
      beta: prev.beta,
    });
  });

  it("keeps malformed attachment keys from mutating the draft attachment map", () => {
    const prev = {
      acme: {
        name: "quote.pdf",
        file: { name: "quote.pdf", uri: "file:///quote.pdf" },
      },
    };

    const next = applyBuyerDraftAttachmentSelection(
      prev,
      "   ",
      { name: "next.pdf", file: { name: "next.pdf", uri: "file:///next.pdf" } },
    );

    expect(next).toBe(prev);
  });

  it("classifies loading state explicitly", () => {
    expect(resolveBuyerRfqPrefillBoundary({ status: "loading" })).toEqual({
      status: "loading",
      metadata: {},
    });
  });

  it("classifies null and undefined payloads as missing", () => {
    expect(resolveBuyerRfqPrefillBoundary({ status: "loaded", metadata: null })).toEqual({
      status: "missing",
      metadata: {},
    });
    expect(resolveBuyerRfqPrefillBoundary({ status: "loaded", metadata: undefined })).toEqual({
      status: "missing",
      metadata: {},
    });
  });

  it("classifies empty payloads as loaded instead of missing", () => {
    expect(resolveBuyerRfqPrefillBoundary({ status: "loaded", metadata: {} })).toEqual({
      status: "loaded",
      metadata: {},
    });
  });

  it("classifies partial valid payloads as ready", () => {
    expect(
      resolveBuyerRfqPrefillBoundary({
        status: "loaded",
        metadata: { whatsapp: " +7 999 123 45 67 " },
      }),
    ).toEqual({
      status: "ready",
      metadata: { whatsapp: "+7 999 123 45 67" },
    });
  });

  it("classifies malformed payloads as invalid", () => {
    expect(
      resolveBuyerRfqPrefillBoundary({
        status: "loaded",
        metadata: { phone: 777123456 },
      }),
    ).toEqual({
      status: "invalid",
      metadata: {},
      reason: "phone_not_string",
    });
  });

  it("classifies terminal fetch failures explicitly", () => {
    const error = new Error("prefill failed");
    const next = resolveBuyerRfqPrefillBoundary({ status: "terminal", error });

    expect(next).toEqual({
      status: "terminal",
      metadata: {},
      error,
    });
  });

  it("preserves the valid prefill success path for untouched fields", () => {
    const boundary = resolveBuyerRfqPrefillBoundary({
      status: "loaded",
      metadata: {
        phone: "+996 700 123 456",
        email: " buyer@example.com ",
      },
    });

    const patch = buildBuyerRfqPrefillPatch({
      boundary,
      rfqCity: "Бишкек",
      currentEmail: "",
      currentPhone: "",
      countryCodeTouched: false,
    });

    expect(boundary).toEqual({
      status: "ready",
      metadata: {
        phone: "+996 700 123 456",
        email: "buyer@example.com",
      },
    });
    expect(patch).toEqual({
      countryCode: "+996",
      email: "buyer@example.com",
      phone: "700123456",
    });
  });

  it("does not falsely promote invalid or terminal payloads into ready patches", () => {
    const invalidBoundary = resolveBuyerRfqPrefillBoundary({
      status: "loaded",
      metadata: { email: 42 },
    });
    const terminalBoundary = resolveBuyerRfqPrefillBoundary({
      status: "terminal",
      error: new Error("boom"),
    });

    expect(
      buildBuyerRfqPrefillPatch({
        boundary: invalidBoundary,
        rfqCity: "Бишкек",
        currentEmail: "",
        currentPhone: "",
        countryCodeTouched: false,
      }),
    ).toEqual({});
    expect(
      buildBuyerRfqPrefillPatch({
        boundary: terminalBoundary,
        rfqCity: "Бишкек",
        currentEmail: "",
        currentPhone: "",
        countryCodeTouched: false,
      }),
    ).toEqual({});
  });
});

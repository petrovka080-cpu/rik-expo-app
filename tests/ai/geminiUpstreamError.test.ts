import { classifyGeminiUpstreamError } from "../../supabase/functions/gemini-generate-content/upstreamError";

describe("gemini upstream error classification", () => {
  it("classifies leaked server keys without exposing upstream secret wording", () => {
    expect(
      classifyGeminiUpstreamError({
        status: 403,
        message: "Your API key was reported as leaked. Please use another API key.",
      }),
    ).toEqual({
      category: "server_secret_invalid",
      publicMessage: "Gemini server API key is invalid or disabled.",
    });
  });

  it("keeps normal upstream errors in the generic upstream category", () => {
    expect(
      classifyGeminiUpstreamError({
        status: 429,
        message: "Quota exceeded.",
      }),
    ).toEqual({
      category: "upstream_error",
      publicMessage: "Quota exceeded.",
    });
  });

  it("does not classify unrelated forbidden responses as secret failures", () => {
    expect(
      classifyGeminiUpstreamError({
        status: 403,
        message: "Caller does not have permission.",
      }),
    ).toEqual({
      category: "upstream_error",
      publicMessage: "Caller does not have permission.",
    });
  });
});

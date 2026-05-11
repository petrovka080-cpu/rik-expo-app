import {
  evaluateAiModelBoundaryGuardrail,
} from "../../scripts/architecture_anti_regression_suite";

describe("AI model provider boundary architecture contract", () => {
  it("keeps runtime Gemini access behind LegacyGeminiModelProvider", () => {
    const result = evaluateAiModelBoundaryGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_model_provider_boundary",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      aiModelGatewayPresent: true,
      aiModelTypesPresent: true,
      aiDisabledProviderPresent: true,
      aiLegacyGeminiProviderPresent: true,
      assistantClientUsesGateway: true,
      directGeminiImportsOutsideLegacyProvider: 0,
      providerImplementationImportsFromUi: 0,
      openAiLiveCallFindings: 0,
      apiKeyClientFindings: 0,
      aiReportsRedactionContractPresent: true,
    });
  });

  it("fails on direct Gemini imports, provider implementation imports from UI, and live OpenAI calls", () => {
    const result = evaluateAiModelBoundaryGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: [
        "src/features/ai/assistantClient.ts",
        "src/features/ai/model/AiModelGateway.ts",
        "src/features/ai/model/AiModelTypes.ts",
        "src/features/ai/model/DisabledModelProvider.ts",
        "src/features/ai/model/LegacyGeminiModelProvider.ts",
        "src/lib/ai_reports.ts",
        "src/screens/example/BadScreen.tsx",
      ],
      readFile: (relativePath) => {
        if (relativePath === "src/screens/example/BadScreen.tsx") {
          return [
            'import { invokeGeminiGateway } from "../../lib/ai/geminiGateway";',
            'import { LegacyGeminiModelProvider } from "../../features/ai/model";',
            'fetch("https://api.openai.com/v1/responses");',
          ].join("\n");
        }
        if (relativePath === "src/features/ai/assistantClient.ts") return "AiModelGateway";
        if (relativePath === "src/lib/ai_reports.ts") {
          return "redactAiReportForStorage redactAiReportStorageText(input.content) rawprompt";
        }
        return "present";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(
      expect.arrayContaining([
        "direct_gemini_import:file=src/screens/example/BadScreen.tsx",
        "ui_provider_implementation_import:file=src/screens/example/BadScreen.tsx",
        "openai_live_call:file=src/screens/example/BadScreen.tsx",
      ]),
    );
  });
});

import { runExactPromptPackAcceptanceProof } from "./aiPromptPackAcceptanceCore";

runExactPromptPackAcceptanceProof({
  artifactDirName: "S_AI_3000_ADDITIONAL_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
  fixtureFileName: "ai_3000_additional_real_work_prompts.json",
  sourceFileName: "ai_3000_additional_real_work_prompts.source.json",
  wave: "S_AI_3000_ADDITIONAL_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_POINT_OF_NO_RETURN",
  greenStatus: "GREEN_AI_3000_ADDITIONAL_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_READY",
  blockedStatus: "BLOCKED_AI_3000_ADDITIONAL_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
  expectedTotalPrompts: 3000,
  expectedDomainsTotal: 60,
  expectedFirstId: "W051-01-01",
  expectedLastId: "W110-10-05",
  pdfSampleCases: 100,
  envPrefix: "AI_3000_ADDITIONAL_REAL_WORK",
});

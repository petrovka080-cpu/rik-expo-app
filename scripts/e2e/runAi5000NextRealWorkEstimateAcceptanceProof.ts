import { runExactPromptPackAcceptanceProof } from "./aiPromptPackAcceptanceCore";

runExactPromptPackAcceptanceProof({
  artifactDirName: "S_AI_5000_NEXT_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
  fixtureFileName: "ai_5000_next_real_work_prompts.json",
  sourceFileName: "ai_5000_next_real_work_prompts.source.json",
  wave: "S_AI_5000_NEXT_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_POINT_OF_NO_RETURN",
  greenStatus: "GREEN_AI_5000_NEXT_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_READY",
  blockedStatus: "BLOCKED_AI_5000_NEXT_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
  expectedTotalPrompts: 5000,
  expectedDomainsTotal: 100,
  expectedFirstId: "W111-01-01",
  expectedLastId: "W210-10-05",
  pdfSampleCases: 100,
  envPrefix: "AI_5000_NEXT_REAL_WORK",
});

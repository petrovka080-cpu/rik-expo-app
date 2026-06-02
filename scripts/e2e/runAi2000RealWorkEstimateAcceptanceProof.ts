import { runExactPromptPackAcceptanceProof } from "./aiPromptPackAcceptanceCore";

runExactPromptPackAcceptanceProof({
  artifactDirName: "S_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
  fixtureFileName: "ai_2000_real_work_prompts.json",
  sourceFileName: "ai_2000_real_work_prompts.source.json",
  wave: "S_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_POINT_OF_NO_RETURN",
  greenStatus: "GREEN_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK_READY",
  blockedStatus: "BLOCKED_AI_2000_REAL_WORK_ESTIMATE_ACCEPTANCE_PACK",
  expectedTotalPrompts: 2000,
  expectedDomainsTotal: 50,
  expectedFirstId: "W01-01-01",
  expectedLastId: "W50-08-05",
  pdfSampleCases: 100,
  envPrefix: "AI_2000_REAL_WORK",
});

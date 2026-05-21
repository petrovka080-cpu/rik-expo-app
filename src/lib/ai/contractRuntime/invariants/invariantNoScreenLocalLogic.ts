import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantNoScreenLocalLogic(findingsCount = 0) {
  return createAiInvariantCheck(
    "NO_SCREEN_LOCAL_AI_LOGIC",
    findingsCount === 0,
    findingsCount === 0 ? undefined : `Найдена screen-local AI logic: ${findingsCount}.`,
  );
}

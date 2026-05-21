import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantNoHooks(findingsCount = 0) {
  return createAiInvariantCheck(
    "NO_HOOKS",
    findingsCount === 0,
    findingsCount === 0 ? undefined : `Найдено AI hook-вызовов: ${findingsCount}.`,
  );
}

import type {
  DirectorFinanceQueryData,
  DirectorFinanceScopeKey,
  DirectorFinanceScreenScopeResult,
} from "./directorFinance.query.types";

export const adaptDirectorFinanceScopeResult = (
  result: DirectorFinanceScreenScopeResult,
  scopeKey: DirectorFinanceScopeKey,
): DirectorFinanceQueryData => ({
  scopeKey,
  finScope: result.canonicalScope,
  panelScope: result.panelScope,
  issues: result.issues,
  supportRowsLoaded: result.supportRowsLoaded,
  cutoverMeta: result.cutoverMeta,
  sourceMeta: result.sourceMeta,
});

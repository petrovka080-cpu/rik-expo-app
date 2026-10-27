import type {
  DirectorFinanceScreenScopeIssue,
  DirectorFinanceScreenScopeResult,
} from "../../../lib/api/directorFinanceScope.service";
import type { DirectorFinanceCanonicalScope } from "../director.readModels";
import type { DirectorFinancePanelScopeV4 } from "../director.finance";

export type {
  DirectorFinanceScreenScopeIssue,
  DirectorFinanceScreenScopeIssueScope,
  DirectorFinanceScreenScopeResult,
} from "../../../lib/api/directorFinanceScope.service";

export type DirectorFinanceScopeParams = {
  readonly objectId?: string | null;
  readonly periodFromIso?: string | null;
  readonly periodToIso?: string | null;
  readonly dueDaysDefault: number;
  readonly criticalDays: number;
};

export type DirectorFinanceScopeKey = string;

export type DirectorFinanceQueryData = {
  readonly scopeKey: DirectorFinanceScopeKey;
  readonly finScope: DirectorFinanceCanonicalScope;
  readonly panelScope: DirectorFinancePanelScopeV4 | null;
  readonly issues: readonly DirectorFinanceScreenScopeIssue[];
  readonly supportRowsLoaded: DirectorFinanceScreenScopeResult["supportRowsLoaded"];
  readonly cutoverMeta: DirectorFinanceScreenScopeResult["cutoverMeta"];
  readonly sourceMeta: DirectorFinanceScreenScopeResult["sourceMeta"];
};

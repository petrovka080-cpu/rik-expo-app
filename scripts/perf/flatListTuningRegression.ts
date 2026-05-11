import fs from "node:fs";
import path from "node:path";

export type RuntimeListKind = "FlatList" | "FlashList";

export type RuntimeListScope =
  | "editable_heavy_exception"
  | "layout_proof"
  | "nested_modal"
  | "report_surface";

export type FlatListTuningAllowlistEntry = {
  file: string;
  ordinal: number;
  kind: RuntimeListKind;
  owner: string;
  reason: string;
  layoutProof: string;
  scope: RuntimeListScope;
};

export type KeyExtractorKind = "missing" | "named" | "inline" | "other";

export type RuntimeListInstance = {
  file: string;
  line: number;
  kind: RuntimeListKind;
  ordinal: number;
  hasInitialNumToRender: boolean;
  hasMaxToRenderPerBatch: boolean;
  hasWindowSize: boolean;
  hasRemoveClippedSubviews: boolean;
  hasKeyExtractor: boolean;
  keyExtractorKind: KeyExtractorKind;
  missingTuningProps: readonly string[];
  allowlist: FlatListTuningAllowlistEntry | null;
  status: "tuned" | "allowlisted" | "violation";
  violationReasons: readonly string[];
};

export type FlatListTuningRegressionSummary = {
  runtimeInstances: number;
  flatListInstances: number;
  flashListInstances: number;
  tunedInstances: number;
  allowlistedInstances: number;
  violations: number;
  missingInitialNumToRender: number;
  missingMaxToRenderPerBatch: number;
  missingWindowSize: number;
  missingKeyExtractor: number;
  unstableKeyExtractor: number;
  removeClippedSubviewsDocumented: number;
  allowlistEntries: number;
  matchedAllowlistEntries: number;
  staleAllowlistEntries: number;
  allowlistMetadataErrors: number;
  editableHeavyExceptions: number;
  nestedInventoryRequired: true;
  topFiles: readonly { file: string; count: number }[];
};

export type FlatListTuningRegressionResult = {
  summary: FlatListTuningRegressionSummary;
  instances: readonly RuntimeListInstance[];
  errors: readonly string[];
};

const SOURCE_ROOTS = ["src", "app"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([
  ".expo",
  ".git",
  "artifacts",
  "coverage",
  "diagnostics",
  "migrated",
  "node_modules",
]);
const WRAPPER_FILE = "src/ui/FlashList.tsx";
const REQUIRED_TUNING_PROPS = [
  "initialNumToRender",
  "maxToRenderPerBatch",
  "windowSize",
] as const;

export const DEFAULT_FLATLIST_TUNING_ALLOWLIST: readonly FlatListTuningAllowlistEntry[] = [
  {
    file: "src/components/foreman/CalcModalContent.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "foreman calc owner",
    reason: "Modal-scoped calc result rows are not a root heavy feed.",
    layoutProof: "Existing modal list has bounded visible height and estimated row sizing; nested list inventory is required.",
  },
  {
    file: "src/components/foreman/CatalogModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "foreman catalog owner",
    reason: "Catalog picker remains modal-scoped and user-filtered.",
    layoutProof: "Existing estimated row sizing and modal viewport bound the visible work.",
  },
  {
    file: "src/components/map/CatalogSearchModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "map search owner",
    reason: "Map catalog search is a nested picker surface, not a root feed.",
    layoutProof: "Existing estimated row sizing and modal viewport bound the visible work.",
  },
  {
    file: "src/components/WorkMaterialsEditor.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "editable_heavy_exception",
    owner: "contractor materials editor owner",
    reason: "Editable local material rows currently depend on index-key semantics to avoid preserving row-local editor state across delete and reorder flows.",
    layoutProof: "Existing estimated row sizing is present; model-level stable row ids are required before changing key identity.",
  },
  {
    file: "src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "buyer proposal details owner",
    reason: "Proposal details sheet is not a root heavy feed.",
    layoutProof: "Sheet viewport and existing estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/buyer/components/BuyerReworkSheetBody.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "layout_proof",
    owner: "buyer rework owner",
    reason: "The list is already tuned, but its key source intentionally includes row position for legacy rework row identity.",
    layoutProof: "Existing tuning props and estimated row sizing remain intact; stable ids require a rework-row model migration.",
  },
  {
    file: "src/screens/contractor/components/ActBuilderModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "contractor act builder owner",
    reason: "Act builder is a modal-scoped editor list.",
    layoutProof: "Existing estimated row sizing and modal viewport bound visible work.",
  },
  {
    file: "src/screens/contractor/components/EstimateMaterialsModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "contractor estimate materials owner",
    reason: "Estimate materials picker is modal-scoped.",
    layoutProof: "Existing estimated row sizing and modal viewport bound visible work.",
  },
  {
    file: "src/screens/contractor/components/WorkStagePickerModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "contractor stage picker owner",
    reason: "Work stage picker is a small nested picker.",
    layoutProof: "Picker viewport and row estimates bound visible work.",
  },
  {
    file: "src/screens/director/DirectorFinanceDebtModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "director finance owner",
    reason: "Finance debt modal is not a root feed.",
    layoutProof: "Modal viewport and existing estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/director/DirectorFinanceKindSuppliersModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "director finance owner",
    reason: "Kind suppliers modal is not a root feed.",
    layoutProof: "Modal viewport and existing estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/director/DirectorFinanceSpendModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "director finance owner",
    reason: "Spend modal is not a root feed.",
    layoutProof: "Modal viewport and existing estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/director/DirectorFinanceSupplierModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "director finance owner",
    reason: "Supplier finance modal is not a root feed.",
    layoutProof: "Modal viewport and existing estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/director/DirectorProposalSheet.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "director proposal owner",
    reason: "Proposal sheet is nested detail UI.",
    layoutProof: "Sheet viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/director/DirectorReportsModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "report_surface",
    owner: "director reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "Report modal inventory is documented; source changes require a dedicated report-surface wave.",
  },
  {
    file: "src/screens/director/DirectorReportsModal.tsx",
    ordinal: 2,
    kind: "FlashList",
    scope: "report_surface",
    owner: "director reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "Report modal inventory is documented; source changes require a dedicated report-surface wave.",
  },
  {
    file: "src/screens/director/DirectorReportsModal.tsx",
    ordinal: 3,
    kind: "FlashList",
    scope: "report_surface",
    owner: "director reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "Report modal inventory is documented; source changes require a dedicated report-surface wave.",
  },
  {
    file: "src/screens/director/DirectorReportsModal.tsx",
    ordinal: 4,
    kind: "FlashList",
    scope: "report_surface",
    owner: "director reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "Report modal inventory is documented; source changes require a dedicated report-surface wave.",
  },
  {
    file: "src/screens/director/DirectorReportsModal.tsx",
    ordinal: 5,
    kind: "FlashList",
    scope: "report_surface",
    owner: "director reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "Report modal inventory is documented; source changes require a dedicated report-surface wave.",
  },
  {
    file: "src/screens/director/DirectorRequestSheet.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "director request owner",
    reason: "Request sheet is nested detail UI.",
    layoutProof: "Sheet viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/foreman/ForemanDraftModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "foreman draft owner",
    reason: "Draft modal is not a root feed.",
    layoutProof: "Modal viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/foreman/ForemanHistoryModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "foreman history owner",
    reason: "History modal is not a root feed.",
    layoutProof: "Modal viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/foreman/ForemanSubcontractDraftSections.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "layout_proof",
    owner: "foreman subcontract owner",
    reason: "Draft sections rely on an existing layout override contract.",
    layoutProof: "Existing item-layout override is the source contract for this nested section list.",
  },
  {
    file: "src/screens/foreman/ForemanSubcontractHistoryModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "foreman subcontract owner",
    reason: "Subcontract history modal is not a root feed.",
    layoutProof: "Modal viewport and existing layout override bound visible work.",
  },
  {
    file: "src/screens/foreman/ForemanSubcontractTab.sections.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "layout_proof",
    owner: "foreman subcontract owner",
    reason: "Approved contracts section relies on an existing layout override contract.",
    layoutProof: "Existing item-layout override and clipped-subviews policy are the source contract for this section list.",
  },
  {
    file: "src/screens/warehouse/components/IncomingDetailsSheet.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "warehouse incoming owner",
    reason: "Incoming details sheet is nested detail UI.",
    layoutProof: "Sheet viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/warehouse/components/IncomingItemsSheet.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "warehouse incoming owner",
    reason: "Incoming items sheet is nested detail UI.",
    layoutProof: "Sheet viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/warehouse/components/IssueDetailsSheet.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "warehouse issue owner",
    reason: "Issue details sheet is nested detail UI.",
    layoutProof: "Sheet viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/warehouse/components/PickOptionSheet.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "warehouse picker owner",
    reason: "Pick option sheet is a nested picker.",
    layoutProof: "Sheet viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/warehouse/components/ReqIssueModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "warehouse issue owner",
    reason: "Request issue modal is not a root feed.",
    layoutProof: "Modal viewport and row estimates bound visible work.",
  },
  {
    file: "src/screens/warehouse/components/WarehouseRecipientModal.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "nested_modal",
    owner: "warehouse recipient owner",
    reason: "Recipient modal is a nested picker.",
    layoutProof: "Modal viewport and estimated row sizing bound visible work.",
  },
  {
    file: "src/screens/warehouse/components/WarehouseReportsTab.tsx",
    ordinal: 1,
    kind: "FlashList",
    scope: "report_surface",
    owner: "warehouse reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "WAVE 21 proved this report surface must stay untouched outside a dedicated report wave.",
  },
  {
    file: "src/screens/warehouse/components/WarehouseReportsTab.tsx",
    ordinal: 2,
    kind: "FlashList",
    scope: "report_surface",
    owner: "warehouse reports owner",
    reason: "Report surfaces are protected by existing pagination/load contracts.",
    layoutProof: "WAVE 21 proved this report surface must stay untouched outside a dedicated report wave.",
  },
];

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function shouldSkipDirectory(name: string): boolean {
  return IGNORED_DIRECTORIES.has(name);
}

function listSourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkipDirectory(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && isSourceFile(fullPath)) results.push(fullPath);
  }
  return results;
}

function isTestPath(relativePath: string): boolean {
  return /\.(?:test|spec)\.[tj]sx?$/.test(relativePath) || relativePath.includes("__tests__/");
}

function readTuningIdentifierBlock(source: string, identifier: string): string {
  const identifierPattern = new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\b`);
  const match = identifierPattern.exec(source);
  if (!match) return "";
  return source.slice(match.index, match.index + 1200);
}

function findSpreadIdentifiers(tagSource: string): string[] {
  return Array.from(tagSource.matchAll(/\{\s*\.\.\.\s*([A-Za-z_$][\w$]*)\s*\}/g), (match) => match[1] ?? "")
    .filter((value) => value.length > 0);
}

function tagHasPropOrSpread(source: string, tagSource: string, propName: string): boolean {
  if (new RegExp(`\\b${propName}\\s*=`).test(tagSource)) return true;
  return findSpreadIdentifiers(tagSource).some((identifier) =>
    readTuningIdentifierBlock(source, identifier).includes(propName),
  );
}

function getKeyExtractorKind(tagSource: string): KeyExtractorKind {
  const keyExtractor = /\bkeyExtractor\s*=\s*\{([^}]*)\}/s.exec(tagSource);
  if (!keyExtractor) return "missing";
  const expression = (keyExtractor[1] ?? "").trim();
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?$/.test(expression)) return "named";
  if (expression.includes("=>") || expression.startsWith("function")) return "inline";
  return "other";
}

function isRuntimeListClosingLine(line: string, isStartLine: boolean): boolean {
  if (/^\s*\/>\s*;?\s*$/.test(line)) return true;
  return isStartLine && /\/>\s*;?\s*$/.test(line);
}

function findAllowlistEntry(
  allowlist: readonly FlatListTuningAllowlistEntry[],
  params: { file: string; ordinal: number; kind: RuntimeListKind },
): FlatListTuningAllowlistEntry | null {
  return (
    allowlist.find(
      (entry) =>
        normalizePath(entry.file) === params.file &&
        entry.ordinal === params.ordinal &&
        entry.kind === params.kind,
    ) ?? null
  );
}

export function collectRuntimeListInstancesFromSource(params: {
  file: string;
  source: string;
  allowlist?: readonly FlatListTuningAllowlistEntry[];
}): RuntimeListInstance[] {
  const file = normalizePath(params.file);
  const allowlist = params.allowlist ?? DEFAULT_FLATLIST_TUNING_ALLOWLIST;
  const lines = params.source.split(/\r?\n/);
  const instances: RuntimeListInstance[] = [];
  let ordinal = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const tagMatch = /^\s*<\s*(FlatList|FlashList)(?:\b|<)/.exec(line);
    if (!tagMatch) continue;

    const kind = tagMatch[1] as RuntimeListKind;
    ordinal += 1;
    const tagLines = [line];
    let cursor = index;
    while (
      cursor < lines.length - 1 &&
      !isRuntimeListClosingLine(lines[cursor] ?? "", cursor === index)
    ) {
      cursor += 1;
      tagLines.push(lines[cursor] ?? "");
      if (tagLines.length >= 100) break;
    }

    const tagSource = tagLines.join("\n");
    const missingTuningProps = REQUIRED_TUNING_PROPS.filter(
      (propName) => !tagHasPropOrSpread(params.source, tagSource, propName),
    );
    const keyExtractorKind = getKeyExtractorKind(tagSource);
    const allowlistEntry = findAllowlistEntry(allowlist, { file, ordinal, kind });
    const violationReasons: string[] = [];

    if (!allowlistEntry) {
      for (const propName of missingTuningProps) {
        violationReasons.push(`missing ${propName}`);
      }
      if (keyExtractorKind === "missing") violationReasons.push("missing keyExtractor");
      if (keyExtractorKind === "inline" || keyExtractorKind === "other") {
        violationReasons.push("keyExtractor is not a named stable reference");
      }
    }

    instances.push({
      file,
      line: index + 1,
      kind,
      ordinal,
      hasInitialNumToRender: !missingTuningProps.includes("initialNumToRender"),
      hasMaxToRenderPerBatch: !missingTuningProps.includes("maxToRenderPerBatch"),
      hasWindowSize: !missingTuningProps.includes("windowSize"),
      hasRemoveClippedSubviews: tagHasPropOrSpread(params.source, tagSource, "removeClippedSubviews"),
      hasKeyExtractor: keyExtractorKind !== "missing",
      keyExtractorKind,
      missingTuningProps,
      allowlist: allowlistEntry,
      status: allowlistEntry ? "allowlisted" : violationReasons.length === 0 ? "tuned" : "violation",
      violationReasons,
    });

    index = cursor;
  }

  return instances;
}

function allowlistKey(entry: FlatListTuningAllowlistEntry): string {
  return `${normalizePath(entry.file)}#${entry.ordinal}#${entry.kind}`;
}

function validateAllowlist(
  allowlist: readonly FlatListTuningAllowlistEntry[],
  instances: readonly RuntimeListInstance[],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const instanceKeys = new Set(instances.map((instance) => `${instance.file}#${instance.ordinal}#${instance.kind}`));

  for (const entry of allowlist) {
    const key = allowlistKey(entry);
    if (seen.has(key)) errors.push(`duplicate FlatList tuning allowlist entry: ${key}`);
    seen.add(key);
    if (!entry.owner.trim()) errors.push(`allowlist entry ${key} is missing owner`);
    if (!entry.reason.trim()) errors.push(`allowlist entry ${key} is missing reason`);
    if (!entry.layoutProof.trim()) errors.push(`allowlist entry ${key} is missing layout proof`);
    if (!instanceKeys.has(key)) errors.push(`stale FlatList tuning allowlist entry: ${key}`);
  }

  return errors;
}

function countByFile(instances: readonly RuntimeListInstance[]): readonly { file: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const instance of instances) {
    counts.set(instance.file, (counts.get(instance.file) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file))
    .slice(0, 12);
}

export function summarizeFlatListTuningRegression(params: {
  instances: readonly RuntimeListInstance[];
  allowlist: readonly FlatListTuningAllowlistEntry[];
  allowlistErrors: readonly string[];
}): FlatListTuningRegressionSummary {
  const violatingInstances = params.instances.filter((instance) => instance.status === "violation");
  const matchedAllowlistEntries = params.instances.filter((instance) => instance.allowlist !== null).length;
  const staleAllowlistEntries = params.allowlist.filter((entry) => {
    const key = allowlistKey(entry);
    return !params.instances.some((instance) => `${instance.file}#${instance.ordinal}#${instance.kind}` === key);
  }).length;

  return {
    runtimeInstances: params.instances.length,
    flatListInstances: params.instances.filter((instance) => instance.kind === "FlatList").length,
    flashListInstances: params.instances.filter((instance) => instance.kind === "FlashList").length,
    tunedInstances: params.instances.filter((instance) => instance.status === "tuned").length,
    allowlistedInstances: matchedAllowlistEntries,
    violations: violatingInstances.length + params.allowlistErrors.length,
    missingInitialNumToRender: violatingInstances.filter((instance) =>
      instance.missingTuningProps.includes("initialNumToRender"),
    ).length,
    missingMaxToRenderPerBatch: violatingInstances.filter((instance) =>
      instance.missingTuningProps.includes("maxToRenderPerBatch"),
    ).length,
    missingWindowSize: violatingInstances.filter((instance) =>
      instance.missingTuningProps.includes("windowSize"),
    ).length,
    missingKeyExtractor: violatingInstances.filter((instance) => !instance.hasKeyExtractor).length,
    unstableKeyExtractor: violatingInstances.filter(
      (instance) => instance.keyExtractorKind === "inline" || instance.keyExtractorKind === "other",
    ).length,
    removeClippedSubviewsDocumented: params.instances.filter((instance) => instance.hasRemoveClippedSubviews).length,
    allowlistEntries: params.allowlist.length,
    matchedAllowlistEntries,
    staleAllowlistEntries,
    allowlistMetadataErrors: params.allowlistErrors.length,
    editableHeavyExceptions: params.instances.filter(
      (instance) => instance.allowlist?.scope === "editable_heavy_exception",
    ).length,
    nestedInventoryRequired: true,
    topFiles: countByFile(params.instances),
  };
}

export function scanFlatListTuningRegressionSource(params: {
  file: string;
  source: string;
  allowlist?: readonly FlatListTuningAllowlistEntry[];
}): FlatListTuningRegressionResult {
  const allowlist = params.allowlist ?? DEFAULT_FLATLIST_TUNING_ALLOWLIST;
  const instances = collectRuntimeListInstancesFromSource({
    file: params.file,
    source: params.source,
    allowlist,
  });
  const allowlistErrors = validateAllowlist(allowlist, instances);
  const instanceErrors = instances.flatMap((instance) =>
    instance.violationReasons.map((reason) => `${instance.file}:${instance.line} ${instance.kind} ${reason}`),
  );
  const errors = [...instanceErrors, ...allowlistErrors];
  return {
    summary: summarizeFlatListTuningRegression({ instances, allowlist, allowlistErrors }),
    instances,
    errors,
  };
}

export function scanFlatListTuningRegression(
  projectRoot = process.cwd(),
  allowlist: readonly FlatListTuningAllowlistEntry[] = DEFAULT_FLATLIST_TUNING_ALLOWLIST,
): FlatListTuningRegressionResult {
  const instances: RuntimeListInstance[] = [];

  for (const sourceRoot of SOURCE_ROOTS) {
    const absoluteRoot = path.join(projectRoot, sourceRoot);
    for (const filePath of listSourceFiles(absoluteRoot)) {
      const relativePath = normalizePath(path.relative(projectRoot, filePath));
      if (relativePath === WRAPPER_FILE) continue;
      if (isTestPath(relativePath)) continue;
      const source = fs.readFileSync(filePath, "utf8");
      instances.push(
        ...collectRuntimeListInstancesFromSource({
          file: relativePath,
          source,
          allowlist,
        }),
      );
    }
  }

  const allowlistErrors = validateAllowlist(allowlist, instances);
  const instanceErrors = instances.flatMap((instance) =>
    instance.violationReasons.map((reason) => `${instance.file}:${instance.line} ${instance.kind} ${reason}`),
  );
  const errors = [...instanceErrors, ...allowlistErrors];

  return {
    summary: summarizeFlatListTuningRegression({ instances, allowlist, allowlistErrors }),
    instances,
    errors,
  };
}

export function evaluateFlatListTuningRegressionGuardrail(result: FlatListTuningRegressionResult): {
  check: { name: string; status: "pass" | "fail"; errors: string[] };
  summary: FlatListTuningRegressionSummary;
} {
  return {
    check: {
      name: "flatlist_tuning_regression",
      status: result.errors.length === 0 ? "pass" : "fail",
      errors: [...result.errors],
    },
    summary: result.summary,
  };
}

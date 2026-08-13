import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Candidate = {
  candidateId: string;
  category: string;
  titleRu: string;
  unitId: string;
  applicability: "APPLICABLE" | "CONDITIONAL";
  basis?: string;
};
type Scope = {
  catalogId: string;
  operation: string;
  variant: string;
  candidates: Candidate[];
};

const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const required = (name: string): string => {
  const value = argv[name];
  if (!value) throw new Error(`DRYWALL_FLAT_CEILING_CODEGEN_ARGUMENT_MISSING:${name}`);
  return path.resolve(value);
};
const evidenceRoot = required("evidence-root");
const output = required("output");
const scopes = readFileSync(path.join(evidenceRoot, "05-execution/INDEPENDENT_EXPECTED_RESOURCE_SCOPE.jsonl"), "utf8")
  .trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Scope);
const selected = readFileSync(path.join(evidenceRoot, "02-selection/BATCH003_SELECTED_CATALOG_ID_INDEX.jsonl"), "utf8")
  .trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as { catalogId: string });
if (scopes.length !== 36 || selected.length !== 36) throw new Error("DRYWALL_FLAT_CEILING_CODEGEN_DENOMINATOR_RED");
const standards = scopes.filter((scope) => scope.variant === "standard");
if (standards.length !== 7) throw new Error("DRYWALL_FLAT_CEILING_CODEGEN_STANDARD_DENOMINATOR_RED");
const common = standards[0].candidates.filter((candidate) => standards.every((scope) => scope.candidates.some((item) => item.candidateId === candidate.candidateId)));
const commonIds = new Set(common.map((candidate) => candidate.candidateId));
const operationEntries = standards.map((scope) => [scope.operation, scope.candidates.filter((candidate) => !commonIds.has(candidate.candidateId))] as const);
const standardByOperation = new Map(standards.map((scope) => [scope.operation, new Set(scope.candidates.map((candidate) => candidate.candidateId))]));
const variants = ["large_area", "small_area", "technical_room", "wet_zone", "high_load"] as const;
const variantEntries = variants.map((variant) => {
  const scope = scopes.find((item) => item.variant === variant);
  if (!scope) throw new Error(`DRYWALL_FLAT_CEILING_CODEGEN_VARIANT_MISSING:${variant}`);
  const standardIds = standardByOperation.get(scope.operation)!;
  return [variant, scope.candidates.filter((candidate) => !standardIds.has(candidate.candidateId))] as const;
});
const json = (value: unknown): string => JSON.stringify(value, null, 2);
const source = `/* Generated from the independently frozen BATCH-003 expected-resource scope.
 * The production builder consumes this implementation contract; the independent
 * auditor reads the frozen evidence directly and never imports this module.
 */

export type DrywallFlatCeilingOperationV6 = "PREPARE" | "FRAME" | "ALIGN" | "INSULATE" | "CLAD" | "FINISH_JOINT" | "REPAIR";
export type DrywallFlatCeilingVariantV6 = "standard" | "large_area" | "small_area" | "technical_room" | "wet_zone" | "high_load";
export type DrywallFlatCeilingExpectedCandidateV6 = {
  candidateId: string;
  category: "material" | "labor" | "equipment" | "transport" | "testing" | "documentation" | "subcontract_service" | "temporary_work" | "waste";
  titleRu: string;
  unitId: string;
  applicability: "APPLICABLE" | "CONDITIONAL";
};

export const DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6: readonly string[] = Object.freeze(${json(selected.map((row) => row.catalogId))});

const COMMON: readonly DrywallFlatCeilingExpectedCandidateV6[] = Object.freeze(${json(common)} as DrywallFlatCeilingExpectedCandidateV6[]);
const OPERATION: Readonly<Record<DrywallFlatCeilingOperationV6, readonly DrywallFlatCeilingExpectedCandidateV6[]>> = Object.freeze(${json(Object.fromEntries(operationEntries))} as Record<DrywallFlatCeilingOperationV6, DrywallFlatCeilingExpectedCandidateV6[]>);
const VARIANT: Readonly<Record<DrywallFlatCeilingVariantV6, readonly DrywallFlatCeilingExpectedCandidateV6[]>> = Object.freeze(${json({ standard: [], ...Object.fromEntries(variantEntries) })} as Record<DrywallFlatCeilingVariantV6, DrywallFlatCeilingExpectedCandidateV6[]>);

export function drywallFlatCeilingExpectedCandidatesV6(operation: DrywallFlatCeilingOperationV6, variant: DrywallFlatCeilingVariantV6): readonly DrywallFlatCeilingExpectedCandidateV6[] {
  return [...COMMON, ...OPERATION[operation], ...VARIANT[variant]];
}
`;
writeFileSync(output, source, "utf8");
process.stdout.write(JSON.stringify({ output, selected: selected.length, common: common.length, operationCandidates: operationEntries.reduce((sum, [, rows]) => sum + rows.length, 0), variantCandidates: variantEntries.reduce((sum, [, rows]) => sum + rows.length, 0) }, null, 2));

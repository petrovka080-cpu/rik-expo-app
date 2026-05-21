import {
  isInternalAiSourceRef,
  type AiContextGraphAnswer,
  type AiContextGraphNode,
  type AiSourceRef,
} from "./aiSourceRef";

export type AiContextGraphSemanticGuardResult = {
  passed: boolean;
  blockers: string[];
  factsWithoutSourceRef: number;
  externalSourcesUsedAsInternalFacts: number;
  dangerousMutationsFound: number;
  approvalBypassFound: number;
  brokenDeepLinksFound: number;
  crossRoleLinkLeaksFound: number;
};

function sourceRefMap(sourceRefs: readonly AiSourceRef[]): Map<string, AiSourceRef> {
  return new Map(sourceRefs.map((ref) => [ref.id, ref]));
}

export function validateAiContextGraphNodes(nodes: readonly AiContextGraphNode[]): AiContextGraphSemanticGuardResult {
  const sourceIds = new Set(nodes.map((node) => node.ref.id));
  const factsWithoutSourceRef = nodes.reduce(
    (count, node) => count + node.facts.filter((fact) => !fact.sourceRefId || !sourceIds.has(fact.sourceRefId)).length,
    0,
  );
  const brokenDeepLinksFound = nodes.filter((node) => node.ref.permission.canOpen && !node.ref.appLink?.route).length;
  const blockers = [
    ...(factsWithoutSourceRef ? [`${factsWithoutSourceRef} graph facts have no valid sourceRef.`] : []),
    ...(brokenDeepLinksFound ? [`${brokenDeepLinksFound} openable refs have no deep link route.`] : []),
  ];

  return {
    passed: blockers.length === 0,
    blockers,
    factsWithoutSourceRef,
    externalSourcesUsedAsInternalFacts: 0,
    dangerousMutationsFound: 0,
    approvalBypassFound: 0,
    brokenDeepLinksFound,
    crossRoleLinkLeaksFound: 0,
  };
}

export function validateAiContextGraphAnswer(answer: AiContextGraphAnswer): AiContextGraphSemanticGuardResult {
  const refs = sourceRefMap(answer.sourceRefs);
  const factItems = answer.answerRu.sections.flatMap((section) =>
    section.items.filter((item) => item.status === "found" || item.status === "risk" || item.status === "blocked"),
  );
  const factsWithoutSourceRef = factItems.filter((item) => item.sourceRefIds.length === 0).length;
  const missingRefIds = factItems.flatMap((item) => item.sourceRefIds.filter((id) => !refs.has(id)));
  const externalSourcesUsedAsInternalFacts = factItems.filter((item) =>
    item.sourceRefIds.some((id) => {
      const ref = refs.get(id);
      return ref ? !isInternalAiSourceRef(ref) : false;
    }),
  ).length;
  const dangerousMutationsFound =
    answer.safetyStatus.changedData ||
    answer.safetyStatus.finalSubmit ||
    answer.safetyStatus.dangerousMutation
      ? 1
      : 0;
  const approvalBypassFound =
    answer.safetyStatus.approvalRequired && answer.safetyStatus.finalSubmit ? 1 : 0;
  const brokenDeepLinksFound = answer.answerRu.openLinks.filter((link) => link.enabled && !link.route).length;
  const crossRoleLinkLeaksFound = answer.answerRu.openLinks.filter((link) => {
    const ref = refs.get(link.sourceRefId);
    return link.enabled && ref?.permission.canOpen === false;
  }).length;

  const blockers = [
    ...(factsWithoutSourceRef ? [`${factsWithoutSourceRef} answer facts have no sourceRef.`] : []),
    ...(missingRefIds.length ? [`Missing sourceRefs: ${missingRefIds.join(", ")}`] : []),
    ...(externalSourcesUsedAsInternalFacts ? [`${externalSourcesUsedAsInternalFacts} internal facts use external sources.`] : []),
    ...(dangerousMutationsFound ? ["Answer reports a dangerous mutation."] : []),
    ...(approvalBypassFound ? ["Answer bypasses approval."] : []),
    ...(brokenDeepLinksFound ? [`${brokenDeepLinksFound} enabled open links have no route.`] : []),
    ...(crossRoleLinkLeaksFound ? [`${crossRoleLinkLeaksFound} cross-role link leaks found.`] : []),
  ];

  return {
    passed: blockers.length === 0,
    blockers,
    factsWithoutSourceRef,
    externalSourcesUsedAsInternalFacts,
    dangerousMutationsFound,
    approvalBypassFound,
    brokenDeepLinksFound,
    crossRoleLinkLeaksFound,
  };
}

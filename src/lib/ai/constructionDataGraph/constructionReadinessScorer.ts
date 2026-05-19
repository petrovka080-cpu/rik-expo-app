import type {
  ConstructionDataGraphEvent,
  ConstructionReadinessSummary,
} from "./constructionDataGraphTypes";

export function scoreConstructionReadiness(
  events: ConstructionDataGraphEvent[],
): ConstructionReadinessSummary {
  const total = events.length;
  const done = events.filter((event) => event.status === "done" || event.status === "ready_for_act").length;
  const readyForAct = events.filter((event) => event.status === "ready_for_act").length;
  const materialBlocked = events.filter((event) =>
    event.blockers.some((blocker) => blocker.kind === "material_missing"),
  ).length;
  const missingEvidence = events.filter((event) =>
    event.blockers.some((blocker) =>
      ["photo_missing", "document_missing", "signature_missing", "act_missing"].includes(blocker.kind),
    ),
  ).length;
  const notClosed = events.filter((event) =>
    event.status !== "done" && event.status !== "ready_for_act",
  ).length;
  const readinessScore = total === 0
    ? 0
    : Math.round(((readyForAct + done) / (total * 2)) * 100);

  return {
    total,
    done,
    notClosed,
    readyForAct,
    materialBlocked,
    missingEvidence,
    readinessScore,
  };
}

export const constructionReadinessScorer = scoreConstructionReadiness;

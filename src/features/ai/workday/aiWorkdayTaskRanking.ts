import type {
  AiWorkdayTaskCard,
  AiWorkdayTaskRiskLevel,
  AiWorkdayTaskSafeMode,
  AiWorkdayTaskSourceCard,
  AiWorkdayTaskUrgency,
} from "./aiWorkdayTaskTypes";

const URGENCY_SCORE: Record<AiWorkdayTaskUrgency, number> = {
  now: 0,
  today: 1,
  this_week: 2,
  monitor: 3,
};

const RISK_SCORE: Record<AiWorkdayTaskRiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function urgencyForWorkdayPriority(
  priority: AiWorkdayTaskSourceCard["priority"],
): AiWorkdayTaskUrgency {
  if (priority === "critical") return "now";
  if (priority === "high") return "today";
  if (priority === "normal") return "this_week";
  return "monitor";
}

export function riskForWorkdayMode(params: {
  mode: AiWorkdayTaskSafeMode;
  priority: AiWorkdayTaskSourceCard["priority"];
}): AiWorkdayTaskRiskLevel {
  if (params.mode === "approval_required") return "high";
  if (params.mode === "draft_only") return "medium";
  if (params.mode === "forbidden") return "critical";
  return params.priority === "critical" || params.priority === "high" ? "medium" : "low";
}

export function scoreAiWorkdayTask(card: AiWorkdayTaskCard): number {
  return RISK_SCORE[card.riskLevel] * 10 + URGENCY_SCORE[card.urgency];
}

export function rankAiWorkdayTasks(
  cards: readonly AiWorkdayTaskCard[],
): AiWorkdayTaskCard[] {
  return [...cards].sort((left, right) => {
    const scoreDelta = scoreAiWorkdayTask(left) - scoreAiWorkdayTask(right);
    if (scoreDelta !== 0) return scoreDelta;
    return left.taskId.localeCompare(right.taskId);
  });
}

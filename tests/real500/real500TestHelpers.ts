import {
  evaluateReal500Acceptance,
  summarizeReal500,
} from "../../scripts/e2e/real500AcceptanceCore";

let cached: ReturnType<typeof evaluateReal500Acceptance> | null = null;

export function real500Evaluation() {
  if (!cached) cached = evaluateReal500Acceptance();
  return cached;
}

export function real500Summary() {
  return summarizeReal500(real500Evaluation());
}

import fixtures from "./concreteMeasuredProjectInputsR533.json";

/** Pinned pre-removal measured project inputs; schedules select physical facts, never work identity. */
export function measuredConcreteProjectInputR533(
  factory: string,
  schedule: "compact" | "extended",
): Record<string, string | number | boolean> {
  const key = `${factory}:${schedule}`;
  const input = (fixtures as Record<string, Record<string, string | number | boolean>>)[key];
  if (!input) throw new Error(`MEASURED_CONCRETE_PROJECT_FIXTURE_UNSUPPORTED:${key}`);
  return { ...input };
}

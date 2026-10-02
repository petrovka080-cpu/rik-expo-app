/** Existing scalar cross-field constraints shared by backend and form projection.
 * No formula evaluation, unit inference or engineering design belongs here.
 */
export const NUMERIC_PARAMETER_RELATIONS = Object.freeze([
  ["equalToParameter", (left: number, right: number) => left === right],
  ["greaterThanOrEqualParameter", (left: number, right: number) => left >= right],
  ["greaterThanParameter", (left: number, right: number) => left > right],
  ["lessThanOrEqualParameter", (left: number, right: number) => left <= right],
  ["lessThanParameter", (left: number, right: number) => left < right],
] as const);

export type NumericParameterRelation = typeof NUMERIC_PARAMETER_RELATIONS[number][0];
export type NumericParameterPeerConstraints = Readonly<Partial<Record<NumericParameterRelation, string>>>;

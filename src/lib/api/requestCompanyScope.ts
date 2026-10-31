// Explicit caller intent only; SQL verifies actual membership/MFA/action.
// Never infer a historical document company from the current actor membership.
export function requireExplicitRequestCompany(value: unknown): string {
  const companyId = typeof value === "string" ? value.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    throw new Error("REQUEST_EXPLICIT_COMPANY_REQUIRED: выберите компанию для новой заявки");
  }
  return companyId;
}

export function parseRequestCompany(value: unknown): string | null {
  if (value == null) return null;
  return requireExplicitRequestCompany(value).toLowerCase();
}
export function assertRequestCompanyMatches(actual: unknown, expected: string | null | undefined): void {
  const parsed = parseRequestCompany(actual);
  if (expected != null && parsed !== requireExplicitRequestCompany(expected).toLowerCase()) {
    throw new Error("REQUEST_COMPANY_RESPONSE_CONFLICT");
  }
}

export type ForemanRequestPdfRequest = {
  version: "v1";
  role: "foreman";
  documentType: "request";
  requestId: string;
  generatedBy?: string | null;
};

const trimText = (value: unknown) => String(value ?? "").trim();

export function normalizeForemanRequestPdfRequest(
  value: unknown,
): ForemanRequestPdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("foreman request pdf payload must be an object");
  }

  const row = value as Record<string, unknown>;
  const version = trimText(row.version);
  const role = trimText(row.role).toLowerCase();
  const documentType = trimText(row.documentType);
  const requestId = trimText(row.requestId);
  const generatedBy = trimText(row.generatedBy);

  if (version !== "v1") {
    throw new Error(`foreman request pdf payload invalid version: ${version || "<empty>"}`);
  }
  if (role !== "foreman") {
    throw new Error(`foreman request pdf payload invalid role: ${role || "<empty>"}`);
  }
  if (documentType !== "request") {
    throw new Error(`foreman request pdf payload invalid documentType: ${documentType || "<empty>"}`);
  }
  if (!requestId) {
    throw new Error("foreman request pdf payload missing requestId");
  }

  return {
    version: "v1",
    role: "foreman",
    documentType: "request",
    requestId,
    generatedBy: generatedBy || null,
  };
}

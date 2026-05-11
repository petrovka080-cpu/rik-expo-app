import type { AiActionAuditEventType } from "../audit/aiActionAuditTypes";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiRiskLevel } from "../policy/aiRiskPolicy";

export type AiToolName =
  | "search_catalog"
  | "compare_suppliers"
  | "get_warehouse_status"
  | "get_finance_summary"
  | "draft_request"
  | "draft_report"
  | "draft_act"
  | "submit_for_approval"
  | "get_action_status";

export type AiToolJsonSchema =
  | AiToolJsonStringSchema
  | AiToolJsonNumberSchema
  | AiToolJsonBooleanSchema
  | AiToolJsonArraySchema
  | AiToolJsonObjectSchema;

export type AiToolJsonStringSchema = {
  type: "string";
  description?: string;
  minLength?: number;
  enum?: readonly string[];
};

export type AiToolJsonNumberSchema = {
  type: "number";
  description?: string;
  minimum?: number;
  maximum?: number;
};

export type AiToolJsonBooleanSchema = {
  type: "boolean";
  description?: string;
};

export type AiToolJsonArraySchema = {
  type: "array";
  description?: string;
  minItems?: number;
  maxItems?: number;
  items: AiToolJsonSchema;
};

export type AiToolJsonObjectSchema = {
  type: "object";
  description?: string;
  required: readonly string[];
  additionalProperties: false;
  properties: Record<string, AiToolJsonSchema>;
};

export type AiToolDefinition = {
  name: AiToolName;
  description: string;
  domain: AiDomain;
  riskLevel: AiRiskLevel;
  inputSchema: AiToolJsonObjectSchema;
  outputSchema: AiToolJsonObjectSchema;
  requiredRoles: readonly AiUserRole[];
  approvalRequired: boolean;
  idempotencyRequired: boolean;
  auditEvent: AiActionAuditEventType;
  rateLimitScope: string;
  cacheAllowed: boolean;
  evidenceRequired: boolean;
};

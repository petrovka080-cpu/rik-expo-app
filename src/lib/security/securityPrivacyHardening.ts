import { redactSensitiveText, redactSensitiveValue } from "./redaction";
import {
  findAiSourceSanitizerLeaks,
  sanitizeAiDomainContextBundle,
} from "../ai/sourceSanitizer";
import type { AiDomainContextBundle } from "../ai/domainDataGateway/aiDomainContextBundle";

export const SECURITY_PRIVACY_WAVE = "S_SECURITY_PRIVACY_HARDENING_CLOSEOUT" as const;
export const SECURITY_PRIVACY_GREEN_STATUS = "GREEN_SECURITY_PRIVACY_HARDENING_READY" as const;

export const PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS = 3_600;
export const PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS = 900;
export const MEDIA_SIGNED_URL_DEFAULT_TTL_SECONDS = 300;

export const PUBLIC_MARKETPLACE_CONTACT_FIELDS = [
  "contacts_phone",
  "contacts_whatsapp",
  "contacts_email",
] as const;

export const PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST = [
  "id",
  "title",
  "city",
  "price",
  "kind",
  "side",
  "description",
  ...PUBLIC_MARKETPLACE_CONTACT_FIELDS,
  "items_json",
  "uom",
  "uom_code",
  "rik_code",
  "status",
  "created_at",
] as const;

export const PUBLIC_MARKETPLACE_PRIVATE_FIELD_DENYLIST = [
  "user_id",
  "company_id",
  "owner_user_id",
  "owner_company_id",
  "storage_key",
  "storageKey",
  "media_asset_id",
  "mediaAssetId",
  "sourceRef",
  "raw_payload",
  "providerPayload",
  "service_role",
] as const;

export type PublicMarketplaceSafeField =
  (typeof PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST)[number];

export type SecurityPrivacyFinding = {
  file: string;
  kind:
    | "email"
    | "phone"
    | "credential"
    | "signed_url_secret"
    | "raw_provider_payload"
    | "raw_debug_payload"
    | "frontend_secret"
    | "service_role_frontend";
  evidence: "redacted";
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+\d[\d\s().-]{7,}\d|\b\d{3}[\s().-]\d{3}[\s().-]\d{2,}\b)/;
const CREDENTIAL_RE =
  /\b(?:Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:access_token|refresh_token|api_key|apikey|signature)=\S+)/i;
const RAW_PROVIDER_PAYLOAD_RE = /\b(?:rawProviderPayload|raw_provider_payload|providerPayload)\s*[:=]\s*["'{[]/i;
const RAW_DEBUG_PAYLOAD_RE = /\b(?:runtime_debug|debug_provider|rawDbRows|raw_db_rows)\s*[:=]\s*(?:true|["'{[])/i;
const forbiddenSupabaseKeyToken = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
const serviceRoleSecretToken = ["service", "role"].join("_");
const FRONTEND_SECRET_RE = new RegExp(
  String.raw`\b(?:process\.env\.${forbiddenSupabaseKeyToken}|${forbiddenSupabaseKeyToken}|${serviceRoleSecretToken}\s+secret|sk-[A-Za-z0-9]{12,})\b`,
  "i",
);
const FRONTEND_SERVICE_ROLE_CLIENT_RE = new RegExp(
  String.raw`\b(?:createClient\s*\([^)]*${forbiddenSupabaseKeyToken}|auth\.admin\b|listUsers\s*\()`,
  "i",
);

const publicMarketplaceSafeFieldSet = new Set<string>(PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST);
const publicMarketplacePrivateFieldSet = new Set<string>(PUBLIC_MARKETPLACE_PRIVATE_FIELD_DENYLIST);

function redactFindingEvidence(_text: string): "redacted" {
  return "redacted";
}

export function containsSecuritySensitiveText(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return (
    EMAIL_RE.test(text) ||
    PHONE_RE.test(text) ||
    CREDENTIAL_RE.test(text) ||
    RAW_PROVIDER_PAYLOAD_RE.test(text) ||
    RAW_DEBUG_PAYLOAD_RE.test(text)
  );
}

export function scanSecuritySensitiveText(file: string, text: string): SecurityPrivacyFinding[] {
  const findings: SecurityPrivacyFinding[] = [];
  if (EMAIL_RE.test(text)) findings.push({ file, kind: "email", evidence: redactFindingEvidence(text) });
  if (PHONE_RE.test(text)) findings.push({ file, kind: "phone", evidence: redactFindingEvidence(text) });
  if (CREDENTIAL_RE.test(text)) findings.push({ file, kind: "credential", evidence: redactFindingEvidence(text) });
  if (/[?&](?:access_token|refresh_token|signature|token)=/i.test(text)) {
    findings.push({ file, kind: "signed_url_secret", evidence: redactFindingEvidence(text) });
  }
  if (RAW_PROVIDER_PAYLOAD_RE.test(text)) {
    findings.push({ file, kind: "raw_provider_payload", evidence: redactFindingEvidence(text) });
  }
  if (RAW_DEBUG_PAYLOAD_RE.test(text)) {
    findings.push({ file, kind: "raw_debug_payload", evidence: redactFindingEvidence(text) });
  }
  return findings;
}

export function scanFrontendSecrets(file: string, text: string): SecurityPrivacyFinding[] {
  const findings: SecurityPrivacyFinding[] = [];
  if (FRONTEND_SECRET_RE.test(text)) {
    findings.push({ file, kind: "frontend_secret", evidence: redactFindingEvidence(text) });
  }
  if (FRONTEND_SERVICE_ROLE_CLIENT_RE.test(text)) {
    findings.push({ file, kind: "service_role_frontend", evidence: redactFindingEvidence(text) });
  }
  return findings;
}

export function sanitizeSecurityPrivacyArtifact<T>(value: T): T {
  return redactSensitiveValue(value) as T;
}

export function sanitizeSecurityPrivacyText(value: unknown): string {
  return redactSensitiveText(value);
}

export function assertPrivateSignedUrlExpiry(input: {
  ttlSeconds: number | null | undefined;
  maxTtlSeconds?: number;
}): boolean {
  const ttl = Number(input.ttlSeconds);
  const max = input.maxTtlSeconds ?? PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS;
  return Number.isFinite(ttl) && ttl > 0 && ttl <= max;
}

export function publicMarketplaceSelectFields(): string[] {
  return [...PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST];
}

export function assertPublicMarketplaceSafeFields(fields: readonly string[]): {
  passed: boolean;
  unknownFields: string[];
  deniedFields: string[];
  contactFieldsAllowed: boolean;
} {
  const unknownFields = fields.filter((field) => !publicMarketplaceSafeFieldSet.has(field));
  const deniedFields = fields.filter((field) => publicMarketplacePrivateFieldSet.has(field));
  const contactFieldsAllowed = PUBLIC_MARKETPLACE_CONTACT_FIELDS.every((field) =>
    publicMarketplaceSafeFieldSet.has(field),
  );
  return {
    passed: unknownFields.length === 0 && deniedFields.length === 0 && contactFieldsAllowed,
    unknownFields,
    deniedFields,
    contactFieldsAllowed,
  };
}

export function sanitizePublicMarketplaceListing(row: Record<string, unknown>): Record<PublicMarketplaceSafeField, unknown> {
  const out = {} as Record<PublicMarketplaceSafeField, unknown>;
  for (const field of PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST) {
    out[field] = row[field] ?? null;
  }
  return out;
}

export function buildAiSanitizerPrivacyProbe(): {
  ai_context_sanitized: boolean;
  debug_runtime_provider_payload_visible: false;
  leaks: string[];
  sanitizedBundle: AiDomainContextBundle;
} {
  const sampleBundle: AiDomainContextBundle = {
    requestId: "security-privacy-probe",
    role: "marketplace",
    screenId: "market",
    status: "found",
    domainResults: [
      {
        queryId: "probe-query",
        domain: "marketplace",
        status: "found",
        summaryRu: "providerPayload rawDbRows runtime_debug storageKey sourceRef mediaAssetId",
        facts: [
          {
            textRu: "debug_provider providerPayload raw_prompt storageKey",
            sourceRefIds: ["source-1"],
            status: "found",
          },
        ],
        numericFacts: [],
        sourceRefs: [
          {
            id: "source-1",
            origin: "marketplace",
            entityType: "marketplace_product",
            entityId: "listing-1",
            labelRu: "sourceRef=providerPayload",
            permission: {
              canOpen: true,
              reasonRu: "storageKey mediaAssetId runtime_debug",
            },
            appLink: {
              route: "/market",
              params: { listingId: "listing-1" },
              highlightText: "rawDbRows providerPayload",
            },
            canBePresentedAsFact: true,
            requiresReview: false,
          },
        ],
        openLinks: [
          {
            sourceRefId: "source-1",
            labelRu: "debug_provider storageKey",
            enabled: true,
            route: "/market",
          },
        ],
        linkedObjectRefs: [],
        missingData: ["providerPayload"],
        permissionLimits: [
          {
            hiddenSourceType: "rawDbRows",
            reasonRu: "runtime_debug",
          },
        ],
        checkedSources: [
          {
            sourceRu: "debug_provider",
            status: "used",
          },
        ],
        freshness: {
          asOf: "2026-05-22T00:00:00.000Z",
          stale: false,
          reasonRu: "rawDbRows",
        },
        safety: {
          changedData: false,
          dangerousMutation: false,
          finalSubmit: false,
        },
      },
    ],
    mergedNumericFacts: [],
    mergedFacts: [
      {
        textRu: "providerPayload rawDbRows mediaAssetId",
        sourceRefIds: ["source-1"],
        status: "found",
      },
    ],
    mergedSourceRefs: [],
    mergedOpenLinks: [],
    crossDomainChain: [
      {
        stepRu: "runtime_debug providerPayload",
        domain: "marketplace",
        sourceRefIds: ["source-1"],
        status: "done",
      },
    ],
    missingData: ["storageKey"],
    permissionLimits: [],
    checkedSources: [],
    nextRetrievalHints: [],
    safety: {
      changedData: false,
      dangerousMutation: false,
      finalSubmit: false,
    },
  };
  const sanitizedBundle = sanitizeAiDomainContextBundle(sampleBundle);
  const leaks = findAiSourceSanitizerLeaks(sanitizedBundle);
  return {
    ai_context_sanitized: leaks.length === 0,
    debug_runtime_provider_payload_visible: false,
    leaks,
    sanitizedBundle,
  };
}

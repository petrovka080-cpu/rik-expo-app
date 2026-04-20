# PDF-Z0.3 Document Manifest Contract Design

Status: GREEN audit artifact.

Baseline: `a105e8738e55d4a81f20c1031e5c1b1147578fc8`

Mode: design only. No table, RPC, SQL, Edge, client, viewer, or template was changed.

## Goal

Introduce one backend-owned document lifecycle concept for heavy PDFs:

- client asks for a manifest
- manifest reports whether the artifact is ready, building, stale, failed, or missing
- client opens a prepared artifact when ready
- backend decides freshness from source version and template/render contract version

The manifest is not a second source of business truth. The existing canonical source/RPC/model remains the truth for document content. The manifest only records the lifecycle and artifact identity of a rendered PDF for a specific document scope.

## Canonical Fields

| Field | Type shape | Required | Meaning |
| --- | --- | --- | --- |
| `document_kind` | string enum | yes | Stable family/kind, for example `director_finance_management_report`. |
| `document_scope` | JSON object | yes | Deterministic scope: role, period, object, filters, entity id, mode. |
| `source_version` | string | yes | Hash/version of only business inputs that affect PDF content. |
| `artifact_version` | string | yes for materialized PDFs | Hash/version of `source_version + template_version + render_contract_version`. |
| `status` | `ready` / `building` / `stale` / `failed` / `missing` | yes | Current lifecycle state. |
| `artifact_url` | signed URL or null | optional | Short-lived URL returned to the client when ready. |
| `artifact_path` | storage path or null | optional | Durable storage key for the artifact. |
| `last_built_at` | timestamp or null | yes | Last successful build time for this artifact version. |
| `last_source_change_at` | timestamp or null | yes | Last known content-affecting source change time. |
| `last_successful_artifact` | object or null | yes | Previous usable artifact metadata for diagnostics/fallback policy. |
| `render_contract_version` | string | yes | Version of renderer/materialization contract. |
| `template_version` | string | yes | Version of the HTML/template contract. |
| `error_code` | string or null | yes | Stable failure code for failed/stale/building diagnostics. |
| `error_summary` | string or null | yes | Short safe diagnostic text. |

Recommended but not mandatory in first slice:

- `owner_role`
- `source_contract_version`
- `build_attempt_id`
- `build_started_at`
- `build_finished_at`
- `lock_until`
- `artifact_content_type`
- `artifact_size_bytes`
- `artifact_expires_at`
- `telemetry`

## Status Semantics

| Status | Client behavior | Backend meaning |
| --- | --- | --- |
| `ready` | Open `artifact_url` or request signing for `artifact_path`. | `artifact_version` matches current source/template/render contract. |
| `building` | Show bounded preparation state or subscribe/poll, not raw-compute locally. | A backend build is in progress for the current version. |
| `stale` | Do not present as fresh; request refresh/build. | An older artifact exists but source/template/render version moved. |
| `failed` | Show stable failure and allow retry. | Last build failed with tracked error. |
| `missing` | Ask backend to build or return on-demand path for Tier 2/3. | No known artifact exists for current scope. |

## Scope Model

`document_scope` must be deterministic and minimal:

- Include only parameters that affect content.
- Normalize dates, IDs, role, object filters, price mode, report mode, and template mode.
- Do not include random request IDs, local UI state, loading flags, transport timestamps, or signed URL expiry.

Examples:

```json
{
  "role": "director",
  "family": "finance",
  "report": "management",
  "period_from": "2026-04-01",
  "period_to": "2026-04-30",
  "scope": "all",
  "generated_by_policy": "visible_name"
}
```

```json
{
  "role": "warehouse",
  "document_kind": "object_work",
  "period_from": "2026-04-01",
  "period_to": "2026-04-30",
  "object_id": null
}
```

## Family Ownership

| Family | Manifest shape | Authoritative owner | Notes |
| --- | --- | --- | --- |
| Director finance management | shared manifest, family-specific scope | Backend/DB PDF service | First implementation slice candidate. Reuse existing finance source and template semantics. |
| Director finance supplier summary | shared manifest, family-specific supplier/kind scope | Backend/DB PDF service | Should inherit finance source version and add supplier/kind filters. |
| Director production report | shared manifest, production scope | Existing production PDF backend | PDF-X.B1 already added artifact identity; manifest can sit above it. |
| Director subcontract report | shared manifest, subcontract scope | Backend/DB PDF service | Needs deterministic artifact before manifest is useful. |
| Warehouse material/object-work reports | shared manifest, warehouse scope | Warehouse PDF backend | Strong Tier 1 after Director finance. |
| Proposal shared family | shared manifest optional, summary-first source more important | Shared proposal source owner | Artifact may be optional. |
| Payment order | shared manifest optional | Payment PDF source/RPC owner | Existing RPC contract reduces urgency. |
| Request/foreman/single warehouse docs | no persistent manifest required initially | Current source service | Keep on demand unless usage proves hot. |

## Storage and Signing Rule

The manifest should store durable `artifact_path`, not trust a signed URL as identity. `artifact_url` is a short-lived delivery detail. A new signed URL may be generated for the same fresh artifact without changing `artifact_version`.

## No Second Truth Rule

The manifest must not contain copied totals, grouped rows, or business calculations as authoritative values. If summary data is needed, it belongs to a source/projection contract with its own version. The manifest points to the source/artifact versions and lifecycle state.

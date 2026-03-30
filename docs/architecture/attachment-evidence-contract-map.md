# Attachment Evidence Contract Map

## Supported Entity Types

- `proposal`
  Current Wave 1G canonical entity type for commercial evidence and finance-basis files.

## Evidence Kinds

- `supplier_quote`
  Buyer commercial quote attached to a proposal.
- `commercial_doc`
  Buyer commercial supporting document attached to a proposal.
- `invoice`
  Proposal-linked invoice document kept distinct from accountant commercial-basis list semantics.
- `invoice_source`
  Explicit commercial-basis invoice source if present in legacy data.
- `payment`
  Accountant payment document attached to a proposal-backed finance basis.
- `proposal_pdf`
  Generated proposal PDF attachment.
- `proposal_html`
  Technical buyer-only HTML companion attachment.
- `secondary_attachment`
  Explicit fallback evidence kind for legacy proposal attachments without a stronger business classification.

## Canonical Linkage Fields

- `proposal_attachments.entity_type`
- `proposal_attachments.entity_id`
- `proposal_attachments.evidence_kind`
- `proposal_attachments.created_by`
- `proposal_attachments.visibility_scope`
- `proposal_attachments.mime_type`
- Legacy compatibility fields retained:
  `proposal_id`, `group_key`, `bucket_id`, `storage_path`, `file_name`, `url`, `created_at`

## Canonical Server Boundaries

- Write / linkage:
  `public.proposal_attachment_evidence_attach_v1`
- Read / retrieval:
  `public.proposal_attachment_evidence_scope_v1`

## Visibility Rules

- `buyer_only`
  Current use: `proposal_html`
- `buyer_director_accountant`
  Current use: supplier quotes, commercial docs, invoice/payment evidence, generated proposal PDF, secondary attachments
- `director_accountant`
  Reserved for future server-owned evidence narrowing; not primary in Wave 1G

## Retrieval Consumers

- Buyer generic attachments:
  [proposalAttachments.service.ts](/c:/dev/rik-expo-app/src/lib/api/proposalAttachments.service.ts)
- Buyer repo compatibility shell:
  [buyer.repo.ts](/c:/dev/rik-expo-app/src/screens/buyer/buyer.repo.ts)
- Director proposal detail attachments:
  [director.proposal.detail.ts](/c:/dev/rik-expo-app/src/screens/director/director.proposal.detail.ts)
- Accountant commercial-basis list:
  [accountant.attachments.ts](/c:/dev/rik-expo-app/src/screens/accountant/accountant.attachments.ts)
- Shared attachment open helpers:
  [files.ts](/c:/dev/rik-expo-app/src/lib/files.ts)

## Legacy Fallback Demotion Notes

- Direct table insert into `proposal_attachments` is no longer the primary attachment write path.
- Direct table read from `proposal_attachments` remains only as compatibility fallback when canonical evidence RPC fails.
- Client-side interpretation by `group_key` is demoted from primary truth. Accountant commercial filtering now starts from server-owned `evidence_kind` and `visibility_scope`.

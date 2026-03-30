# Attachment / Commercial Evidence Boundary Proof

- Canonical write boundary: `proposal_attachment_evidence_attach_v1`
- Canonical read boundary: `proposal_attachment_evidence_scope_v1`
- Target proposal: `625ce921-2564-4fca-afec-df3ead020f9e` (PR-0543/2026)
- Bound evidence rows: 4
- Buyer visible rows: 4
- Director visible rows: 3
- Accountant generic visible rows: 3
- Accountant basis rows: 1

What changed:
- Attachment linkage now stores explicit `entity_type`, `entity_id`, `evidence_kind`, `created_by`, `visibility_scope`, and `mime_type` on the server.
- Buyer/accountant uploads bind through the canonical attach RPC instead of direct `proposal_attachments` inserts.
- Buyer/director/accountant retrieval now reads the canonical evidence scope instead of inferring relation on the client.

Proof points:
- Invalid storage context rejected: yes
- Invalid entity context rejected: yes
- Unbound blob stayed invisible: yes
- Director mismatch is limited to buyer-only technical HTML: yes

Out of scope kept unchanged:
- Attachment UI, picker/viewer UX, storage provider design, proposal/request/accounting semantics.

Final status: GREEN

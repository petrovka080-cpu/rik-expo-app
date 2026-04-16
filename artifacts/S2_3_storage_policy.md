# S2.3 Storage / PDF Access Policy

Status: DEFINED

## Generated PDFs

Generated role PDFs use server-side edge functions:

- validate JWT with `auth.getUser()`;
- resolve role using canonical membership-first truth;
- apply resource policy:
  - Foreman request PDF: foreman owner or same-company director.
  - Warehouse PDF: warehouse or director membership.
  - Director reports: director role by canonical role truth.
- upload with service client only after access passes;
- issue signed URLs with bounded TTL, default 3600 seconds.

## Attachments

Proposal attachments are authorized by the canonical evidence RPC:

- attach: buyer/accountant or authenticated creator of the existing proposal;
- read: evidence scope + visibility scope;
- compatibility table fallback is degraded mode, not canonical access truth.

## Stale URL / Reuse

Signed URLs are transport artifacts, not durable access truth:

- success requires fresh authorized issuance or a row returned from authorized read model;
- stale URL reuse is not considered permission;
- UI should be able to retry URL issuance through authorized read path rather than treating cached URL as permanent access.

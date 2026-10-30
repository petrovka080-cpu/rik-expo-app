// ROOT-only provider check. Never run without reviewed isolated staging fixtures.
// Fixture JSON is an absolute local path in PDF_AUTHORITY_FIXTURES. It supplies
// endpoint, anonKey, and cases with jwt/requestId/actorId/expectedCompanyId/items.
// Credentials are used in memory and are never printed or persisted.
import fs from "node:fs";
import assert from "node:assert/strict";
const fixture = JSON.parse(fs.readFileSync(process.env.PDF_AUTHORITY_FIXTURES, "utf8"));
assert.equal(fixture.environment, "isolated_staging");
const required = ["director_exact_company", "foreman_owner", "legacy_creator", "legacy_other_denied",
  "director_A_foreman_B_nonowner_denied", "removed_member_denied", "enrolled_aal1_denied", "aal2_allowed",
  "same_jwt_factor_added_denied", "unknown_document_denied", "anonymous_denied", "children_ceiling_denied"];
for (const name of required) assert(fixture.cases.some(c => c.name === name), `Missing case ${name}`);
for (const c of fixture.cases) {
  const response = await fetch(`${fixture.endpoint}/rest/v1/rpc/foreman_request_pdf_snapshot_v1`, {
    method: "POST", headers: { apikey: fixture.anonKey, Authorization: `Bearer ${c.jwt || fixture.anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_request_id: c.requestId }),
  });
  const body = await response.json();
  if (c.allow) {
    assert(response.ok, `${c.name}: expected allow`);
    assert.equal(body.authority.actorId, c.actorId, c.name);
    assert.equal(body.authority.companyId, c.expectedCompanyId, c.name);
    assert.equal(body.authority.mode, c.expectedCompanyId === null ? "legacy_creator" : "company", c.name);
    assert.equal(body.request.id, c.requestId, c.name);
    assert.deepEqual(body.items.map(i => i.id), c.items, `${c.name}: complete exact child set`);
  } else {
    assert(!response.ok, `${c.name}: expected deny`);
    assert.equal(body.authority, undefined, `${c.name}: authority leaked`);
    assert.equal(body.items, undefined, `${c.name}: children leaked`);
    assert.equal(body.code, c.errorCode, `${c.name}: expected semantic error`);
  }
  console.log(`${c.name}: PASS`);
}

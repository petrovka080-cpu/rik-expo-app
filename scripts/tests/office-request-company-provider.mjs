// ROOT only: isolated staging fixture, no production, no credential logging.
// Test source only. Setup/cleanup, actual DB rollback/fixture ownership and
// provider/project bindings belong to Root; fixture labels alone prove none of them.
import fs from "node:fs";
import assert from "node:assert/strict";
const fixture = JSON.parse(fs.readFileSync(process.env.REQUEST_COMPANY_FIXTURES, "utf8"));
assert.equal(fixture.environment, "isolated_staging");
assert.equal(fixture.writePermission, "isolated_transactions_only");
const required = ["explicit_company_create", "missing_company_create_denied", "expected_actor_mismatch_denied",
 "legacy_creator_head_read", "legacy_creator_children_read", "legacy_other_read_denied",
 "legacy_creator_child_insert_denied", "legacy_creator_child_update_denied", "legacy_creator_child_delete_denied",
 "director_A_foreman_B_approve_denied", "child_reparent_denied", "aal1_factor_denied",
 "removed_membership_replay_denied", "cross_company_reuse_denied", "existing_target_lost_ack_retry_one_effect",
 "no_id_create_lost_ack_one_effect", "no_id_submit_lost_ack_one_effect", "concurrent_same_creation_intent_one_effect",
 "creation_intent_changed_actor_denied", "creation_intent_changed_company_denied", "creation_intent_changed_payload_denied",
 "same_actor_two_requests_foreign_item_denied", "same_actor_two_requests_foreign_delete_denied"];
for (const name of required) assert(fixture.cases.some(c => c.name === name), `Missing ${name}`);
async function send(request, exactCount = false) {
 const response = await fetch(`${fixture.endpoint}/rest/v1/${request.path}`, {
  method: request.method || "GET", headers: { apikey: fixture.anonKey,
   Authorization: `Bearer ${request.jwt}`, "Content-Type": "application/json", Prefer: exactCount ? "return=representation,count=exact" : "return=representation" },
  ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
 });
 return { status: response.status, data: response.status === 204 ? null : await response.json(), contentRange: response.headers.get("content-range") };
}
for (const c of fixture.cases) {
 assert(c.request && c.expected && c.probe && c.expectedProbe !== undefined, `${c.name}: exact readback required`);
 let first;
 if (c.name === "concurrent_same_creation_intent_one_effect") {
  const body = c.request.body;
  assert.equal(body.p_request_id ?? null, null, "Both first attempts must be no-ID creates");
  assert(body.p_creation_intent_id, "One durable intent must precede both first effects");
  assert.equal(typeof body.p_comment, "string", "Isolated unique request marker required");
  assert(body.p_comment.includes(body.p_creation_intent_id), "Marker must bind this exact fresh intent");
  assert.equal(c.probe.jwt, c.request.jwt, "Readback uses the same ordinary authorized actor");
  const probeUrl = new URL(c.probe.path, "https://provider-fixture.invalid/");
  assert.equal(probeUrl.pathname, "/requests", "Read only this isolated request set");
  assert.equal(c.probe.method || "GET", "GET", "One-effect proof must read the full scoped set");
  const allowedProbeKeys = new Set(["select", "comment", "created_by", "company_id", "order"]);
  for (const key of probeUrl.searchParams.keys()) {
   assert(allowedProbeKeys.has(key), "Pagination/extra filters must not hide duplicate effects");
   assert.equal(probeUrl.searchParams.getAll(key).length, 1, "One exact scoped query value per key");
  }
  const projection = probeUrl.searchParams.get("select");
  assert(projection === null || /^(?:\*|[a-z_][a-z0-9_]*(?:,[a-z_][a-z0-9_]*)*)$/.test(projection),
   "Readback projection must not filter requests through an embedded join");
  assert.equal(probeUrl.searchParams.get("comment"), `eq.${body.p_comment}`);
  assert.equal(probeUrl.searchParams.get("created_by"), `eq.${body.p_creation_actor_id}`);
  assert.equal(probeUrl.searchParams.get("company_id"), `eq.${body.p_company_id}`);
  assert(Array.isArray(c.expectedProbe) && c.expectedProbe.length === 1, "Exact one-effect request readback required");
  const absent = await send(c.probe, true);
  assert.equal(absent.status, 200, `${c.name}: initial readback authorized`);
  assert.deepEqual(absent.data, [], `${c.name}: no completed first creation may precede the race`);
  assert.match(absent.contentRange || "", /\/0$/, `${c.name}: exact empty scoped count required`);
  // These are the FIRST two sends. Neither acknowledgement is awaited before
  // the other is issued. SQL lock/transaction overlap remains a separate gate.
  const results = await Promise.all([send(c.request), send(c.request)]);
  for (const result of results) {
   assert.equal(result.status, 200, c.name);
   assert(result.data.request_payload.id, `${c.name}: persisted request identity`);
   assert([undefined, false, true].includes(result.data.replayed), `${c.name}: typed replay marker`);
  }
  assert.equal(results.filter(result => result.data.replayed === true).length, 1, `${c.name}: exactly one replay`);
  first = results.find(result => result.data.replayed !== true);
  assert(first && first.data.request_created === true, `${c.name}: exactly one initial creation`);
  for (const result of results) {
   assert.equal(result.data.request_payload.id, first.data.request_payload.id, c.name);
   assert.deepEqual(result.data.items_payload, first.data.items_payload, c.name);
  }
 } else {
  first = await send(c.request);
  if (["no_id_create_lost_ack_one_effect", "no_id_submit_lost_ack_one_effect"].includes(c.name)) {
   assert.equal(c.request.body.p_request_id ?? null, null, "Must cover actual first no-ID create");
   assert(c.request.body.p_creation_intent_id, "Persisted intent required before first effect");
   assert.equal(first.status, 200, c.name);
   // Preserve the separate sequential lost-ack/restart contract; the first
   // result is discarded for retry, while exact persisted identity is checked.
   const retry = await send(c.request);
   assert.equal(retry.status, 200, c.name);
   assert.equal(retry.data.request_payload.id, first.data.request_payload.id, c.name);
   assert.deepEqual(retry.data.items_payload, first.data.items_payload, c.name);
   assert.equal(retry.data.replayed, true, c.name);
  }
 }
 assert.deepEqual(first.status, c.expected.status, c.name);
 if (c.expected.code) assert.equal(first.data.code, c.expected.code, c.name);
 if (c.expected.data !== undefined) assert.deepEqual(first.data, c.expected.data, c.name);
 if (c.name === "existing_target_lost_ack_retry_one_effect") {
  assert(c.request.body?.p_request_id, "Known-target replacement regression remains required");
  // Discard successful first payload, replay the identical existing-target
  // replacement intent, then verify exact unchanged child set/quantities.
  const retry = await send(c.request); assert.equal(retry.status, c.expected.status, c.name);
 }
 const probe = await send(c.probe, c.name === "concurrent_same_creation_intent_one_effect");
 assert.equal(probe.status, 200, `${c.name}: readback authorized`);
 if (c.name === "concurrent_same_creation_intent_one_effect") {
  assert.match(probe.contentRange || "", /\/1$/, `${c.name}: full scoped count must prove exactly one effect`);
 }
 assert.deepEqual(probe.data, c.expectedProbe, `${c.name}: exact state/one effect`);
 console.log(`${c.name}: PASS`);
}

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {parseOwnedCompletedReceiptR1 as parse} from './ownedControlFiletimeTransportR1';
import {parseOwnedFiletimeControlR1 as base} from './ownedControlFiletimeTransportR1';

const proof=JSON.parse(readFileSync('data/estimate-benchmarks/source-packs/socket-current-read-witness-a9-r1153.json','utf8'));
const owner=proof.rawArtifacts['DB_OWNER_CONTEXT.json'].utf8;
const receipt=proof.rawArtifacts['receipt.json'].utf8;
// These are immutable completed A9 fixture identities; they never authorize or inspect a PID.
const pg='{"pid":17668,"startFiletime":134378584141114963}';
const parent='{"pid":20076,"startFiletime":134378584060611321}';
const record=(tail:string)=>'{"context":'+owner+',"postgres":'+pg+','+tail+'}';

test('retains all three actual uint64 FILETIMEs exactly and leaves ordinary control reader strict',()=>{
  const actual=parse(receipt,owner);
  assert.equal(actual.context.childStartFiletime,'134378584123317805');
  assert.equal(actual.postgres.startFiletime,'134378584141114963');
  assert.equal(actual.parentMeasuredNotAdopted.startFiletime,'134378584060611321');
  assert.equal(actual.parentMeasuredNotAdopted.pid,20076);
  assert.equal(actual.error,'DB_JEST_FAILED');assert.equal(actual.testsPassed,false);
  assert.equal(actual.normalPgClosure,true);assert.deepEqual(actual.remainingOwnedProcesses,[]);
  assert.throws(()=>base(receipt),/EXACT_TWO_FILETIME_FIELDS_REQUIRED/u);
});
test('nested measured parent cannot be promoted into the root receipt',()=>{
  assert.throws(()=>parse(record('"extra":{"parentMeasuredNotAdopted":'+parent+',"marker":1}'),owner),/TOP_LEVEL_MEASURED_PARENT_REQUIRED/u);
  assert.throws(()=>parse(record('"parentMeasuredNotAdopted":null,"extra":{"parentMeasuredNotAdopted":'+parent+',"marker":1}'),owner),/EXACT_ONE_DECODED_PARENT_KEY/u);
  assert.throws(()=>parse(record(String.raw`"parentMeasuredNotAdopte\u0064":null,`+'"extra":{"parentMeasuredNotAdopted":'+parent+',"marker":1}'),owner),/EXACT_ONE_DECODED_PARENT_KEY/u);
});
test('literal and escaped duplicate keys remain visible to the shared JSON validator',()=>{
  assert.throws(()=>parse(record('"parentMeasuredNotAdopted":'+parent+',"parentMeasuredNotAdopted":'+parent+',"marker":1'),owner));
  const escaped=String.raw`"parentMeasuredNotAdopte\u0064"`;
  assert.throws(()=>parse(record('"parentMeasuredNotAdopted":'+parent+','+escaped+':null,"marker":1'),owner));
});
test('unknown parent fields and invalid PID or uint64 lexemes are rejected',()=>{
  for(const invalid of ['{"pid":20076,"startFiletime":134378584060611321,"extra":1}',
    '{"pid":-1,"startFiletime":134378584060611321}',
    '{"pid":4294967296,"startFiletime":134378584060611321}',
    '{"pid":20076,"startFiletime":18446744073709551616}',
    '{"pid":20076,"startFiletime":1e4}',
    '{"pid":20076,"startFiletime":"134378584060611321"}'])
    assert.throws(()=>parse(record('"parentMeasuredNotAdopted":'+invalid+',"marker":1'),owner));
});
test('an extra control FILETIME or a parent newer than child never becomes accepted evidence',()=>{
  assert.throws(()=>parse(record('"parentMeasuredNotAdopted":'+parent+',"extra":{"startFiletime":134378584060611321}'),owner));
  assert.throws(()=>parse(record('"parentMeasuredNotAdopted":{"pid":20076,"startFiletime":134378584123317806},"marker":1'),owner),/PARENT_PRECEDES_CHILD/u);
});

test('completed receipt must use the same native owner, not another well-formed owner',()=>{
  // TEST_ONLY changed owner nonce. The original completed A9 raw receipt is immutable.
  const otherOwner=owner.replace(/("instanceNonce"\s*:\s*)"[0-9a-f-]{36}"/u,'$1"00000000-0000-0000-0000-000000000001"');
  assert.notEqual(otherOwner,owner);
  assert.throws(()=>parse(receipt,otherOwner),/SAME_RECORDED_OWNER/u);
  // An extra control occurrence must not be hidden by escaped spelling.
  assert.throws(()=>parse(record('"parentMeasuredNotAdopted":'+parent+','+String.raw`"extra":{"startFiletim\u0065":134378584060611321}`),owner),/EXACT_TWO_FILETIME_FIELDS_REQUIRED/u);
});

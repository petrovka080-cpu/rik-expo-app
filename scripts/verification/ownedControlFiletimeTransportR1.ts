import assert from 'node:assert/strict';
/** Bounded native-control JSON transport. No domain/source/quantity input. */
export function parseOwnedFiletimeControlR1(text: string): Record<string, any> {
  const fail = (code: string): never => { throw new Error('OWNED_CONTROL_' + code); };
  if (Buffer.byteLength(text, 'utf8') > 131072) fail('BYTE_CAP');
  const source = text.replace(/^\uFEFF/, '');
  // Tokens locate scalar spans only. JSON.parse remains the sole JSON syntax parser.
  const tokens = [...source.matchAll(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|true|false|null|[{}\[\],:]/gu)];
  const keyCounts = new Map<string, number>();
  const replacements: Array<{start: number; end: number; text: string}> = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (!token[0].startsWith('"') || tokens[index + 1]?.[0] !== ':') continue;
    const key: unknown = JSON.parse(token[0]);
    if (typeof key !== 'string') fail('KEY_REQUIRED');
    keyCounts.set(key as string, (keyCounts.get(key as string) ?? 0) + 1);
    if (key !== 'childStartFiletime' && key !== 'startFiletime') continue;
    const value = tokens[index + 2];
    if (!value || !/^[1-9][0-9]{0,19}$/u.test(value[0]) ||
        BigInt(value[0]) > BigInt('18446744073709551615')) fail('EXACT_UINT64_NUMERIC_LEXEME_REQUIRED');
    replacements.push({start: value!.index!, end: value!.index! + value![0].length, text: JSON.stringify(value![0])});
  }
  let transformed = source;
  for (const replacement of replacements.reverse()) {
    transformed = transformed.slice(0, replacement.start) + replacement.text + transformed.slice(replacement.end);
  }
  const parsed: unknown = JSON.parse(transformed, (_key, value: unknown) => {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) fail('OTHER_NUMBER_MUST_BE_SAFE_INTEGER');
    return value;
  });
  const parsedCounts = new Map<string, number>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      parsedCounts.set(key, (parsedCounts.get(key) ?? 0) + 1); visit(item);
    }
  };
  visit(parsed);
  if (keyCounts.size !== parsedCounts.size || [...keyCounts].some(([key, count]) => parsedCounts.get(key) !== count)) fail('DUPLICATE_OR_INVALID_KEYS');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('OBJECT_REQUIRED');
  const record = parsed as Record<string, any>;
  const exactKeys = (value: unknown, keys: string[]): value is Record<string, any> =>
    !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  const decimal = (value: unknown): boolean => typeof value === 'string' && /^[1-9][0-9]{0,19}$/u.test(value) && BigInt(value) <= BigInt('18446744073709551615');
  const positivePid = (value: unknown): boolean => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 4294967295;
  const uuid = (value: unknown): boolean => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(value);
  const owner = Object.hasOwn(record, 'context') ? record.context : record;
  if (!exactKeys(owner, ['commandPath','commandSha256','rootThreadId','instanceNonce','childPid','childStartFiletime','coordinatorNonce']) ||
      typeof owner.commandPath !== 'string' || !owner.commandPath || typeof owner.commandSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(owner.commandSha256) ||
      !uuid(owner.rootThreadId) || !uuid(owner.instanceNonce) || !(owner.coordinatorNonce === null || uuid(owner.coordinatorNonce)) ||
      !positivePid(owner.childPid) || !decimal(owner.childStartFiletime)) fail('OWNER_SCHEMA_REQUIRED');
  if (Object.hasOwn(record, 'context')) {
    if (!exactKeys(record.postgres, ['pid','startFiletime']) || !positivePid(record.postgres.pid) || !decimal(record.postgres.startFiletime)) fail('POSTGRES_SCHEMA_REQUIRED');
    if (replacements.length !== 2) fail('EXACT_TWO_FILETIME_FIELDS_REQUIRED');
  } else if (replacements.length !== 1) fail('EXACT_ONE_FILETIME_FIELD_REQUIRED');
  return record;
}

export function parseOwnedCompletedReceiptR1(raw: string, rawOwner: string): Record<string, any> {
  assert(Buffer.byteLength(raw,'utf8')<=131072,'A9_RECEIPT_BYTE_CAP');
  // The one named parent must be unique even across containers and escaped keys.
  // Tokenize strings with the same JSON lexeme grammar as the shared reader;
  // only key tokens are decoded, so native FILETIMEs never enter Number here.
  const keyTokens=[...raw.matchAll(/"(?:\\.|[^"\\])*"|[:,{}\[\]]/gu)];
  const namedKeys=keyTokens.filter((token,index)=>token[0].startsWith('"')&&keyTokens[index+1]?.[0]===':'&&JSON.parse(token[0])==='parentMeasuredNotAdopted');
  assert.equal(namedKeys.length,1,'A9_EXACT_ONE_DECODED_PARENT_KEY');
  const matches=[...raw.matchAll(/"parentMeasuredNotAdopted"\s*:\s*(\{\s*"pid"\s*:\s*[1-9][0-9]*\s*,\s*"startFiletime"\s*:\s*[1-9][0-9]{0,19}\s*\})\s*,/gu)];
  assert.equal(matches.length,1,'A9_EXACT_NAMED_MEASURED_PARENT');
  const match=matches[0]!;
  const parentControl=parseOwnedFiletimeControlR1('{"context":'+rawOwner+',"postgres":'+match[1]+'}');
  const objectStart=match.index!+match[0].indexOf(match[1]!);
  // Retain the key and container. Shared JSON/key validation must see it.
  const rest=raw.slice(0,objectStart)+'null'+raw.slice(objectStart+match[1]!.length);
  const receipt=parseOwnedFiletimeControlR1(rest);
  assert(Object.hasOwn(receipt,'parentMeasuredNotAdopted')&&receipt.parentMeasuredNotAdopted===null,'A9_TOP_LEVEL_MEASURED_PARENT_REQUIRED');
  assert.deepEqual(parentControl.context,receipt.context,'A9_SAME_RECORDED_OWNER');
  assert(BigInt(parentControl.postgres.startFiletime)<=BigInt(receipt.context.childStartFiletime),'A9_PARENT_PRECEDES_CHILD');
  return{...receipt,parentMeasuredNotAdopted:parentControl.postgres};
}

import { strToU8 } from 'fflate';
import { durableUtf8BytesToString as decode } from './compactConsumerRepairDurableState';

test('preserves exact Unicode, BOM and literal replacement characters at flat buffer boundaries', () => {
  const boundaries = [0, 1, 16382, 16383, 16384, 16385, 32767];
  const suffix = '\u0000\u007f\u0080\u07ff\u0800\ud7ff\ue000\uffff\ufeff\ufffd😀\u{10ffff} Русская смета';
  for (const size of boundaries) {
    const text = 'a'.repeat(size) + suffix;
    expect(decode(strToU8(text))).toBe(text);
  }
  expect(decode(new Uint8Array())).toBe('');
});

test('round-trips deterministic scalar values across the complete Unicode range without browser decoders', () => {
  const points: number[] = [];
  for (let point = 0; point <= 0x10ffff; point += 97) {
    if (point < 0xd800 || point > 0xdfff) points.push(point);
  }
  const text = points.map(point => String.fromCodePoint(point)).join('');
  expect(decode(strToU8(text))).toBe(text);
});

test.each([
  [0x80], [0xbf], [0xc0, 0x80], [0xc1, 0xbf], [0xc2], [0xc2, 0x7f],
  [0xdf, 0xc0], [0xe0, 0x9f, 0xbf], [0xe0, 0xa0], [0xed, 0xa0, 0x80],
  [0xed, 0xbf, 0xbf], [0xef, 0xbf], [0xe1, 0x80, 0x7f], [0xe1, 0x80, 0xc0],
  [0xf0, 0x8f, 0xbf, 0xbf], [0xf0, 0x90, 0x80], [0xf1, 0x80, 0x80, 0x7f],
  [0xf4, 0x90, 0x80, 0x80], [0xf5, 0x80, 0x80, 0x80], [0xff], [0xfe],
])('rejects malformed UTF-8 without replacing bytes: %j', (...bytes) => {
  expect(() => decode(Uint8Array.from(bytes))).toThrow('CONSUMER_REPAIR_DURABLE_INVALID_UTF8');
});

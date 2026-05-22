import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(repoRoot, 'src', 'lib', 'useBusyAction.ts');

describe('useBusyAction hook contract', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('does not suppress exhaustive-deps for the busy action callback', () => {
    expect(source).not.toContain('react-hooks/exhaustive-deps');
    expect(source).not.toContain('TODO(P1): review deps');
  });

  it('keeps timeout copy readable and tied to the configured timeout', () => {
    expect(source).toContain('Таймаут операции');
    expect(source).toContain('Math.round(timeoutMs / 1000)');
    expect(source).not.toMatch(/РЎР|РџР|РћР|Р¤Р|РўР|Р‘Р|РґР|РµР/);
  });
});

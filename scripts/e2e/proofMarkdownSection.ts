export function replaceMarkdownSection(markdown: string, heading: string, replacement: string): string {
  const normalizedMarkdown = markdown.trimEnd();
  const normalizedReplacement = replacement.trimEnd();
  if (!normalizedMarkdown) return normalizedReplacement;

  const lines = normalizedMarkdown.split(/\r?\n/);
  const output: string[] = [];

  for (let index = 0; index < lines.length; ) {
    if (lines[index].trim() === heading) {
      index += 1;
      while (index < lines.length && !lines[index].startsWith("## ")) {
        index += 1;
      }
      continue;
    }

    output.push(lines[index]);
    index += 1;
  }

  const base = output.join("\n").trimEnd();
  return [base, normalizedReplacement].filter(Boolean).join("\n\n");
}

const fs = require("fs");
const path = require("path");

const files = Array.from(new Set([
  ...fs.readdirSync("app", {withFileTypes:true})
]).keys());

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const list = walk("app");

const TAGS = [
  { dom: "div",     rn: "View" },
  { dom: "span",    rn: "Text" },
  { dom: "a",       rn: "Text" },      // <Link> оставляем как есть
  { dom: "button",  rn: "Pressable" },
];

function ensureImports(src) {
  const need = new Set();
  if (/<View[^>]*style=\{\s*\[/.test(src)) need.add("View");
  if (/<Text[^>]*style=\{\s*\[/.test(src) || /<Text>/.test(src)) need.add("Text");
  if (/<Pressable[^>]*style=\{\s*\[/.test(src) || /<Pressable[^>]*onPress=/.test(src)) need.add("Pressable");
  if (!need.size) return src;

  for (const what of need) {
    const re = new RegExp(`import\\s+\\{[^}]*\\b${what}\\b[^}]*\\}\\s+from\\s+['"]react-native['"]\\s*;`);
    if (!re.test(src)) {
      const firstImport = src.match(/^\s*import[\s\S]*?;[\r\n]+/m);
      src = firstImport
        ? src.slice(0, firstImport.index + firstImport[0].length) + `import { ${what} } from 'react-native';\n` + src.slice(firstImport.index + firstImport[0].length)
        : `import { ${what} } from 'react-native';\n` + src;
    }
  }
  return src;
}

// заменяем ТОЛЬКО те теги, у которых style={[...]}
function patchDomWithArrayStyle(src) {
  for (const {dom, rn} of TAGS) {
    const openTag = new RegExp(`<${dom}([^>]*)style=\\{\\s*\\[`, "g");
    // открывающий тег
    src = src.replace(openTag, (m, attrs) => `<${rn}${attrs}style={[`);
    // закрывающий тег для тех, где мы поменяли открывающий (простой случай)
    const closeTag = new RegExp(`</${dom}>`, "g");
    src = src.replace(closeTag, `</${rn}>`);
  }
  return src;
}

let changed = 0;
for (const f of list) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  s = patchDomWithArrayStyle(s);
  s = ensureImports(s);
  if (s !== before) {
    fs.writeFileSync(f, s, "utf8");
    console.log("patched:", f);
    changed++;
  }
}
console.log("done, files changed:", changed);

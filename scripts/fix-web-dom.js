const fs = require("fs");
const path = require("path");

function ensureImport(src, what, from) {
  const re = new RegExp(`import\\s+\\{[^}]*${what}[^}]*\\}\\s+from\\s+['"]${from}['"]\\s*;`);
  if (re.test(src)) return src;
  const firstImport = src.match(/^\s*import[\s\S]*?;[\r\n]+/m);
  if (firstImport) {
    const at = firstImport.index + firstImport[0].length;
    return src.slice(0, at) + `import { ${what} } from '${from}';\n` + src.slice(at);
  }
  return `import { ${what} } from '${from}';\n` + src;
}

function fixDomStyleArrays(src) {
  // style={[a,b,c]} на DOM-тегах -> style={Object.assign({}, a,b,c)}
  return src.replace(
    /<(div|span|a|button)([^>]*?)style=\{\s*\[([\s\S]*?)\]\s*\}([^>]*)>/g,
    (m, tag, pre, arr, post) => `<${tag}${pre}style={Object.assign({}, ${arr.trim()})}${post}>`
  );
}

function fixAccountant(file) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, "utf8");
  // <button ...>...</button> -> Pressable + Text
  s = s.replace(
    /<button([^>]*)>([\s\S]*?)<\/button>/g,
    (m, attrs, inner) => `<Pressable${attrs}><Text>${inner}</Text></Pressable>`
  );
  s = fixDomStyleArrays(s);
  s = ensureImport(s, "Pressable", "react-native");
  s = ensureImport(s, "Text", "react-native");
  fs.writeFileSync(file, s, "utf8");
  console.log(" fixed", path.basename(file));
}

function fixBuyer(file) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, "utf8");
  // <div class="meta"> -> <View style={s.meta}>
  s = s.replace(/<div\s+class=["']meta["']\s*>/g, `<View style={s.meta}>`);
  s = s.replace(/<\/div>\s*<!--\s*meta\s*-->/g, `</View>`); // на случай комментария
  s = fixDomStyleArrays(s);
  s = ensureImport(s, "View", "react-native");
  s = ensureImport(s, "Text", "react-native");
  fs.writeFileSync(file, s, "utf8");
  console.log(" fixed", path.basename(file));
}

function fixSecurity(file) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, "utf8");
  // оставить dangerouslySetInnerHTML только на web
  if (!/Platform\.OS/.test(s)) s = ensureImport(s, "Platform", "react-native");
  if (!/SvgXml/.test(s)) s = `import { SvgXml } from 'react-native-svg';\n` + s;
  s = s.replace(
    /<div\s+dangerouslySetInnerHTML=\{\s*\{\s*__html:\s*qrSvg\s*as\s*string\s*\}\s*\}\s*\/>/g,
    `{Platform.OS === 'web'
  ? <div dangerouslySetInnerHTML={{ __html: qrSvg as string }} />
  : <SvgXml xml={qrSvg as string} />}`
  );
  s = fixDomStyleArrays(s);
  fs.writeFileSync(file, s, "utf8");
  console.log(" fixed", path.basename(file));
}

fixAccountant(path.join("app","(tabs)","accountant.tsx"));
fixBuyer(path.join("app","(tabs)","buyer.tsx"));
fixSecurity(path.join("app","(tabs)","security.tsx"));

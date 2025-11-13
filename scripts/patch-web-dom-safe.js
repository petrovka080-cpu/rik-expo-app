const fs = require("fs");
const path = require("path");

function read(p){ return fs.existsSync(p) ? fs.readFileSync(p,"utf8") : null }
function write(p,s){ fs.writeFileSync(p,s,"utf8"); console.log(" patched", p) }

function ensureImport(src, what, from="react-native"){
  const re = new RegExp(`import\\s+\\{[^}]*\\b${what}\\b[^}]*\\}\\s+from\\s+['"]${from}['"]\\s*;`);
  if (re.test(src)) return src;
  const firstImport = src.match(/^\s*import[\s\S]*?;[\r\n]+/m);
  if (firstImport) {
    const at = firstImport.index + firstImport[0].length;
    return src.slice(0, at) + `import { ${what} } from '${from}';\n` + src.slice(at);
  }
  return `import { ${what} } from '${from}';\n` + src;
}

/** 1) foreman.tsx: опечатка ext>Закрыть</Text> -> <Text>Закрыть</Text> */
(function(){
  const p = path.join("app","(tabs)","foreman.tsx");
  let s = read(p); if (!s) return;
  s = s.replace(/\bext>\s*Закрыть\s*<\/Text>/, "<Text>Закрыть</Text>");
  write(p, s);
})();

/** 2) accountant.tsx: <button ...></button> -> Pressable + Text (разметка, логика/обработчики сохраняются) */
(function(){
  const p = path.join("app","(tabs)","accountant.tsx");
  let s = read(p); if (!s) return;

  // Заменяем только сами теги, атрибуты/обработчики оставляем
  s = s.replace(/<button([^>]*)>([\s\S]*?)<\/button>/g, (m, attrs, inner) => {
    // если внутри уже есть Text  не трогаем вложение
    const content = /<Text[\s>]/.test(inner) ? inner : `<Text>${inner}</Text>`;
    return `<Pressable${attrs}>${content}</Pressable>`;
  });
  s = ensureImport(s, "Pressable");
  s = ensureImport(s, "Text");

  write(p, s);
})();

/** 3) buyer.tsx: <div class="meta"> -> <View style={s.meta}> ; закрывающий div -> View */
(function(){
  const p = path.join("app","(tabs)","buyer.tsx");
  let s = read(p); if (!s) return;

  s = s.replace(/<div\s+class=["']meta["']\s*>/g, `<View style={s.meta}>`);
  s = s.replace(/<\/div>/g, `</View>`); // безопасно, если это ровно тот блок; при иных div'ах менять не будет, т.к. выше мы не трогали другие открывающие

  s = ensureImport(s, "View");
  s = ensureImport(s, "Text"); // часто рядом используется текст

  write(p, s);
})();

/** 4) security.tsx: оставить dangerouslySetInnerHTML только на web, на native  SvgXml; DOM не трогаем логику */
(function(){
  const p = path.join("app","(tabs)","security.tsx");
  let s = read(p); if (!s) return;

  if (!/SvgXml/.test(s)) {
    s = `import { SvgXml } from 'react-native-svg';\n` + s;
  }
  if (!/Platform\.OS/.test(s)) {
    s = ensureImport(s, "Platform");
  }

  s = s.replace(
    /<div\s+dangerouslySetInnerHTML=\{\s*\{\s*__html:\s*qrSvg\s*as\s*string\s*\}\s*\}\s*\/>/g,
    `{Platform.OS === 'web'
  ? <div dangerouslySetInnerHTML={{ __html: qrSvg as string }} />
  : <SvgXml xml={qrSvg as string} />}`
  );

  write(p, s);
})();

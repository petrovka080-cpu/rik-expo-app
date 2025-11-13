const fs = require("fs");
const file = process.argv[2];
let src = fs.readFileSync(file, "utf8");

/** 1) Удалим любые сыровые <div> хвосты после стилей и в целом вне RN */
src = src.replace(/^[ \t]*<div[\s\S]*?<\/div>[ \t]*$/gm, "");

/** 2) Убедимся, что импорт Link есть вверху */
if (!/^\s*import\s*\{\s*Link\s*\}\s*from\s*["']expo-router["'];/m.test(src)) {
  const firstImport = src.match(/^\s*import[\s\S]*?;[\r\n]+/);
  if (firstImport) {
    const at = firstImport.index + firstImport[0].length;
    src = src.slice(0, at) + "import { Link } from 'expo-router';\n" + src.slice(at);
  } else {
    src = "import { Link } from 'expo-router';\n" + src;
  }
}

/** 3) Перед блоком стилей гарантированно закрываем JSX и компонент, если вдруг незакрыты */
const stylesHdrRe = /\/\*\s*=======================\s*Styles[\s\S]*?\*\/\s*[\r\n]+const\s+s\s*=\s*StyleSheet\.create\s*\(\s*\{/m;
const hdrMatch = src.match(stylesHdrRe);
if (hdrMatch) {
  const hdrIdx = hdrMatch.index;
  const before = src.slice(0, hdrIdx);

  // Если прямо перед стилями нет последовательности `);` и `}`  добавим.
  // Эвристика: в последних 500 символах до заголовка стилей ищем закрытия.
  const tail = before.slice(-500);
  const hasCloseJSX = /\)\s*;?\s*$/.test(tail);
  const hasCloseFunc = /\}\s*$/.test(before.replace(/\)\s*;?\s*$/,"")); // после закрытия JSX должна быть }

  let fix = "";
  if (!hasCloseJSX) fix += "\n);\n";
  if (!hasCloseFunc) fix += "}\n";

  if (fix) {
    src = before + fix + src.slice(hdrIdx);
  }
}

/** 4) Удалим всё, что идёт ПОСЛЕ закрывающей скобки стилей `});` */
const styleStart = src.lastIndexOf("StyleSheet.create(");
if (styleStart !== -1) {
  const after = src.slice(styleStart);
  const endIdxLocal = after.indexOf("});");
  if (endIdxLocal !== -1) {
    const endGlobal = styleStart + endIdxLocal + 3; // позиция после "});
    src = src.slice(0, endGlobal) + "\n";
  }
}

/** 5) Если кнопка Рассчитать ещё не вставлена  вставим её перед блоком "Корзина" */
if (src.includes("/* Корзина */") && !src.includes("href=\"/calculator\"") && !src.includes("href='/calculator'")) {
  const btn = `
{/* Калькуляторы (переход на /calculator) */}
<View style={{ marginTop: 10, marginBottom: 6, alignItems: 'flex-start' }}>
  <Link href="/calculator" asChild>
    <Pressable style={[s.btn, s.btnNeutral]}>
      <Text style={s.btnTxt}>Рассчитать</Text>
    </Pressable>
  </Link>
</View>
`;
  src = src.replace("{/* Корзина */}", btn + "\n{/* Корзина */}");
}

fs.writeFileSync(file, src, "utf8");
console.log("Patched:", file);

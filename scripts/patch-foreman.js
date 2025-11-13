const fs = require("fs");

const file = process.argv[2];
let src = fs.readFileSync(file, "utf8");

// 1) Добавим импорт { Link } из expo-router (если нет)
if (!/from\s+["']expo-router["']/.test(src)) {
  // вставим сразу после первого import
  const m = src.match(/^\s*import .*?;[\r\n]+/s);
  if (m) {
    const insertAt = m.index + m[0].length;
    src = src.slice(0, insertAt) + "import { Link } from 'expo-router';\n" + src.slice(insertAt);
  } else {
    // если вдруг импортов нет  добавим в самый верх
    src = "import { Link } from 'expo-router';\n" + src;
  }
}

// 2) Вставим кнопку Рассчитать перед секцией Корзина
const btnBlock = `
{/* Калькуляторы (переход на /calculator) */}
<View style={{ marginTop: 10, marginBottom: 6, alignItems: 'flex-start' }}>
  <Link href="/calculator" asChild>
    <Pressable style={[s.btn, s.btnNeutral]}>
      <Text style={s.btnTxt}>Рассчитать</Text>
    </Pressable>
  </Link>
</View>
`;

if (src.includes("{/* Корзина */}") && !src.includes("href=\"/calculator\"") && !src.includes("href='/calculator'")) {
  src = src.replace("{/* Корзина */}", `${btnBlock}\n{/* Корзина */}`);
}

// 3) Удалим ЛЮБОЙ хвост после блока стилей (всё, что идёт после const s = StyleSheet.create(...);)
const styleStart = src.lastIndexOf("StyleSheet.create(");
if (styleStart !== -1) {
  // найдём конец "});" после styleStart
  const after = src.slice(styleStart);
  const endIdxLocal = after.indexOf("});");
  if (endIdxLocal !== -1) {
    const endGlobal = styleStart + endIdxLocal + 3; // позиция после "});"
    // оставляем всё до конца стилей и выкидываем хвост
    src = src.slice(0, endGlobal);
    // гарантируем перевод строки в конце
    if (!src.endsWith("\n")) src += "\n";
  }
}

// 4) Подчистим явные HTML-хвосты на всякий случай (если вдруг что-то осталось)
src = src
  .replace(/^\s*import\s*\{\s*Link\s*\}\s*from\s*["']expo-router["'];\s*<\/div>[\s\S]*$/m, "import { Link } from 'expo-router';")
  .replace(/^[ \t]*<div[\s\S]*?<\/div>[ \t]*$/gm, ""); // любые <div> вне JSX RN  убрать

fs.writeFileSync(file, src, "utf8");
console.log("Patched:", file);

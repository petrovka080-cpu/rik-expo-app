// ловит ТОЛЬКО web. ищет style-массивы на сырых DOM-тегах и логирует источник
// удалишь после фикса
 
const React = require("react");
const orig = React.createElement;

let reported = false;

React.createElement = function (type: any, props: any, ...children: any[]) {
  if (!reported && typeof type === "string" && props && Array.isArray(props.style)) {
    reported = true;
    if (__DEV__) {
      // печатаем виновника: тег, props.style и стек (чтобы увидеть файл/строку)
      console.error(
        "[STYLE-ARRAY→DOM] tag =", type,
        "\nstyle =", props.style,
        "\nstack =",
        new Error().stack
      );
    }
  }
  return orig(type, props, ...children);
};

// web-only: гарантированно расплющиваем style-массивы на ЛЮБОМ элементе
// Это исполняется только в браузере. На iOS/Android (Hermes) кода не будет.
if (typeof document !== "undefined") {
   
  const React = require("react");
  const origCreateElement = React.createElement;
  const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object";
  const flattenStyleArray = (style: unknown[]): Record<string, unknown> =>
    Object.assign(
      {},
      ...style.filter(
        (entry): entry is Record<string, unknown> =>
          isObjectRecord(entry) && !Array.isArray(entry),
      ),
    );

  React.createElement = function (type: any, props: any, ...children: any[]) {
    if (props && Array.isArray(props.style)) {
      // Превращаем style={[a,b,c]} -> style={Object.assign({}, a,b,c)}
      props = { ...props, style: flattenStyleArray(props.style) };
    }
    // Дополнительно нормализуем style из вида {[0]:..., [1]:...} (на всякий случай)
    if (props && isObjectRecord(props.style) && 0 in props.style) {
      const s = props.style;
      const flat: Record<string, unknown> = {};
      Object.keys(s).forEach((k) => {
        if (!/^\d+$/.test(k)) flat[k] = s[k];
      });
      props = { ...props, style: flat };
    }
    return origCreateElement(type, props, ...children);
  };

  // маркер — чтобы видеть, что гард точно активен
  // eslint-disable-next-line no-console
  if (__DEV__) console.log("[webStyleGuard] ACTIVE (flatten-all)");
}

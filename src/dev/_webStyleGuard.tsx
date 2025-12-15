// web-only: гарантированно расплющиваем style-массивы на ЛЮБОМ элементе
// Это исполняется только в браузере. На iOS/Android (Hermes) кода не будет.
if (typeof document !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");
  const origCreateElement = React.createElement;

  React.createElement = function (type: any, props: any, ...children: any[]) {
    if (props && Array.isArray(props.style)) {
      // Превращаем style={[a,b,c]} -> style={Object.assign({}, a,b,c)}
      try { props = { ...props, style: Object.assign({}, ...props.style) }; } catch {}
    }
    // Дополнительно нормализуем style из вида {[0]:..., [1]:...} (на всякий случай)
    if (props && props.style && typeof props.style === "object" && 0 in props.style) {
      try {
        const s = props.style as any;
        const flat: Record<string, any> = {};
        Object.keys(s).forEach((k) => {
          if (!/^\d+$/.test(k)) flat[k] = s[k];
        });
        props = { ...props, style: flat };
      } catch {}
    }
    return origCreateElement(type, props, ...children);
  };

  // маркер — чтобы видеть, что гард точно активен
  // eslint-disable-next-line no-console
  console.log("[webStyleGuard] ACTIVE (flatten-all)");
}


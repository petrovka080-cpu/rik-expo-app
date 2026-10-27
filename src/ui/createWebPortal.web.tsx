import React from "react";
import { createPortal } from "react-dom";

export function renderWebPortal(element: React.ReactElement) {
  if (typeof document === "undefined" || !document.body) {
    return element;
  }

  return createPortal(element, document.body);
}

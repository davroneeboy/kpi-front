"use client";

import { useEffect } from "react";

function isAllowedCopyTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false;
  const el = t.closest(
    "input, textarea, select, [contenteditable='true']",
  );
  return Boolean(el);
}

/**
 * Matnni nusxalashni cheklash (capture bosqichi + klaviatura + ajratish).
 */
export function CopyProtection() {
  useEffect(() => {
    const capture = true;

    const blockClipboard = (e: ClipboardEvent) => {
      if (isAllowedCopyTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const blockSelectStart = (e: Event) => {
      if (isAllowedCopyTarget(e.target)) return;
      e.preventDefault();
    };

    const blockDrag = (e: DragEvent) => {
      if (isAllowedCopyTarget(e.target)) return;
      e.preventDefault();
    };

    const blockContextMenu = (e: MouseEvent) => {
      if (isAllowedCopyTarget(e.target)) return;
      e.preventDefault();
    };

    const blockKeys = (e: KeyboardEvent) => {
      if (isAllowedCopyTarget(document.activeElement)) return;
      if (!e.ctrlKey && !e.metaKey) return;
      const k = e.key.toLowerCase();
      /* nusxa, kesish, butun sahifani tanlash */
      if (k === "c" || k === "x" || k === "a") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("copy", blockClipboard, capture);
    document.addEventListener("cut", blockClipboard, capture);
    document.addEventListener("selectstart", blockSelectStart, capture);
    document.addEventListener("dragstart", blockDrag, capture);
    document.addEventListener("contextmenu", blockContextMenu, capture);
    document.addEventListener("keydown", blockKeys, capture);

    return () => {
      document.removeEventListener("copy", blockClipboard, capture);
      document.removeEventListener("cut", blockClipboard, capture);
      document.removeEventListener("selectstart", blockSelectStart, capture);
      document.removeEventListener("dragstart", blockDrag, capture);
      document.removeEventListener("contextmenu", blockContextMenu, capture);
      document.removeEventListener("keydown", blockKeys, capture);
    };
  }, []);

  return null;
}

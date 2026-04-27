'use client';

import { useEffect } from 'react';

export function ProtectionLayer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const onContext = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U, Ctrl/Cmd+S, Ctrl/Cmd+P
      if (
        k === 'f12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
        ((e.ctrlKey || e.metaKey) && (k === 'u' || k === 's' || k === 'p'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'IMG') e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection()?.toString() ?? '';
      if (sel.length > 80) e.preventDefault();
    };

    document.addEventListener('contextmenu', onContext);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('dragstart', onDrag);
    document.addEventListener('copy', onCopy);

    // Devtools heuristic — desktop only. Mobile browsers have address bars
    // and toolbars that make outer/inner dimension diffs huge by default,
    // which would false-positive and blur the entire page.
    const isMobile =
      window.matchMedia?.('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0 ||
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    let warned = false;
    let id: number | undefined;
    if (!isMobile) {
      const tick = () => {
        const threshold = 220;
        const opened =
          window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold;
        if (opened && !warned) {
          warned = true;
          document.body.style.filter = 'blur(20px)';
        } else if (!opened && warned) {
          warned = false;
          document.body.style.filter = '';
        }
      };
      id = window.setInterval(tick, 1000);
    }

    return () => {
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('dragstart', onDrag);
      document.removeEventListener('copy', onCopy);
      if (id !== undefined) window.clearInterval(id);
    };
  }, []);

  return null;
}

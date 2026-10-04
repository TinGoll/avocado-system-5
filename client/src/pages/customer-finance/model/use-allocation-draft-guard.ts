import { useEffect } from 'react';
import { useBeforeUnload } from 'react-router';

const warning = 'Есть несохранённое распределение. Покинуть страницу?';

export const useAllocationDraftGuard = (active: boolean) => {
  useBeforeUnload(
    (event) => {
      if (!active) return;
      event.preventDefault();
      event.returnValue = warning;
    },
    { capture: true },
  );

  useEffect(() => {
    if (!active) return;
    const protectInternalLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      )
        return;
      if (!window.confirm(warning)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', protectInternalLink, true);
    return () =>
      document.removeEventListener('click', protectInternalLink, true);
  }, [active]);
};

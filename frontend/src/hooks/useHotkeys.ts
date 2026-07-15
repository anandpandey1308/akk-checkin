import { useEffect, useRef } from 'react';

type KeyCombo = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export function useHotkeys(keys: KeyCombo, callback: (e: KeyboardEvent) => void) {
  // Use a ref for the callback to prevent keydown event listeners from constantly re-binding
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // If the user is typing in an input/textarea, ignore global single-key shortcuts (like '/')
      // But allow modifications (like Alt+S or Ctrl+Enter) to still work!
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isModified = event.altKey || event.ctrlKey || event.metaKey;
      
      if (isInput && !isModified && keys.key === '/') {
        return;
      }

      const keyMatches = event.key.toLowerCase() === keys.key.toLowerCase();
      const altMatches = keys.altKey === undefined ? true : event.altKey === keys.altKey;
      const ctrlMatches = keys.ctrlKey === undefined ? true : event.ctrlKey === keys.ctrlKey;
      const metaMatches = keys.metaKey === undefined ? true : event.metaKey === keys.metaKey;
      const shiftMatches = keys.shiftKey === undefined ? true : event.shiftKey === keys.shiftKey;

      if (keyMatches && altMatches && ctrlMatches && metaMatches && shiftMatches) {
        event.preventDefault();
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys.key, keys.altKey, keys.ctrlKey, keys.metaKey, keys.shiftKey]);
}

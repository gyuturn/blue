'use client';

import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장소가 막힌 브라우저(사파리 개인정보 보호 모드 등)에서는 저장을 건너뛴다
  }
  notify();
}

// 서버 렌더링과 첫 hydration에서는 null을 돌려줘 mismatch를 피한다
export function useLocalStorageItem(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => readLocalStorage(key),
    () => null,
  );
  const setValue = useCallback((next: string | null) => writeLocalStorage(key, next), [key]);
  return [value, setValue] as const;
}

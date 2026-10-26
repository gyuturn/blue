'use client';

import { useEffect } from 'react';

// 스토어 패키징(PWABuilder) 시 서비스 워커가 있어야 설치형 앱으로 인정된다 (#59)
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}

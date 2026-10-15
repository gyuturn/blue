'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageItem } from '@/hooks/useLocalStorage';
import { ANNOUNCEMENTS_HOME, hasDeviceScore } from '@/lib/home';
import { LAST_SCORE_KEY } from '@/lib/scoreStorage';

// 헤더 로고 등 앱 안에서 메인으로 이동하면 레이아웃의 인라인 스크립트가 다시 실행되지 않으므로 여기서 보낸다 (#117)
export default function DeviceScoreRedirect() {
  const router = useRouter();
  const [raw] = useLocalStorageItem(LAST_SCORE_KEY);

  useEffect(() => {
    if (hasDeviceScore(raw)) router.replace(ANNOUNCEMENTS_HOME);
  }, [raw, router]);

  return null;
}

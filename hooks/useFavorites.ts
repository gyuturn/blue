'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement } from '@/types';
import { useLocalStorageItem } from '@/hooks/useLocalStorage';

const LS_KEY = 'blue_favorites';

function parseLsFavorites(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// isLoggedIn: true = 로그인, false = 비로그인, null = 아직 확인 중
export function useFavorites(isLoggedIn: boolean | null) {
  const [serverFavoriteIds, setServerFavoriteIds] = useState<string[]>([]);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, string>>({}); // houseManageNo → rowId
  const [lsRaw, setLsRaw] = useLocalStorageItem(LS_KEY);
  const lsFavoriteIds = useMemo(() => parseLsFavorites(lsRaw), [lsRaw]);

  const favoriteIds = useMemo(
    () => (isLoggedIn === false ? lsFavoriteIds : isLoggedIn ? serverFavoriteIds : []),
    [isLoggedIn, lsFavoriteIds, serverFavoriteIds],
  );

  const setFavoriteIds = useCallback(
    (update: string[] | ((prev: string[]) => string[])) => {
      if (isLoggedIn === false) {
        const next = typeof update === 'function' ? update(lsFavoriteIds) : update;
        setLsRaw(JSON.stringify(next));
      } else {
        setServerFavoriteIds(update);
      }
    },
    [isLoggedIn, lsFavoriteIds, setLsRaw],
  );

  useEffect(() => {
    if (!isLoggedIn) return; // 확인 중이거나 비로그인이면 localStorage 값을 그대로 쓴다

    fetch('/api/favorites')
      .then((r) => r.json())
      .then((json) => {
        const rows: { id: string; houseManageNo: string }[] = json.data ?? [];
        setServerFavoriteIds(rows.map((r) => r.houseManageNo));
        const map: Record<string, string> = {};
        rows.forEach((r) => { map[r.houseManageNo] = r.id; });
        setFavoriteMap(map);
      })
      .catch(() => {});
  }, [isLoggedIn]);

  const toggle = useCallback(
    async (announcement: Announcement) => {
      if (isLoggedIn === null) return; // auth 확인 전 클릭 무시

      const { id: houseManageNo, complexName, region } = announcement;
      const isFav = favoriteIds.includes(houseManageNo);

      if (!isLoggedIn) {
        const next = isFav
          ? favoriteIds.filter((x) => x !== houseManageNo)
          : [...favoriteIds, houseManageNo];
        setFavoriteIds(next);
        return;
      }

      if (isFav) {
        const favId = favoriteMap[houseManageNo];
        // optimistic remove
        setFavoriteIds((prev) => prev.filter((x) => x !== houseManageNo));
        setFavoriteMap((prev) => { const n = { ...prev }; delete n[houseManageNo]; return n; });
        fetch(`/api/favorites/${favId}`, { method: 'DELETE' }).catch(() => {
          // rollback
          setFavoriteIds((prev) => [...prev, houseManageNo]);
          setFavoriteMap((prev) => ({ ...prev, [houseManageNo]: favId }));
        });
      } else {
        // optimistic add
        setFavoriteIds((prev) => [...prev, houseManageNo]);
        fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ houseManageNo, complexName, region }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.data?.id) {
              setFavoriteMap((prev) => ({ ...prev, [houseManageNo]: json.data.id }));
            }
          })
          .catch(() => {
            setFavoriteIds((prev) => prev.filter((x) => x !== houseManageNo));
          });
      }
    },
    [favoriteIds, favoriteMap, isLoggedIn, setFavoriteIds]
  );

  return { favoriteIds, toggle };
}

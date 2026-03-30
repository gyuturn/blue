'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Announcement } from '@/types';

const LS_KEY = 'blue_favorites';

function getLsFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setLsFavorites(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

export function useFavorites(isLoggedIn: boolean) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, string>>({}); // id → houseManageNo

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/favorites')
        .then((r) => r.json())
        .then((json) => {
          const rows: { id: string; houseManageNo: string }[] = json.data ?? [];
          setFavoriteIds(rows.map((r) => r.houseManageNo));
          const map: Record<string, string> = {};
          rows.forEach((r) => { map[r.houseManageNo] = r.id; });
          setFavoriteMap(map);
        })
        .catch(() => {});
    } else {
      setFavoriteIds(getLsFavorites());
    }
  }, [isLoggedIn]);

  const toggle = useCallback(
    async (announcement: Announcement) => {
      const { id: houseManageNo, complexName, region } = announcement;
      const isFav = favoriteIds.includes(houseManageNo);

      if (!isLoggedIn) {
        const next = isFav
          ? favoriteIds.filter((x) => x !== houseManageNo)
          : [...favoriteIds, houseManageNo];
        setFavoriteIds(next);
        setLsFavorites(next);
        return;
      }

      if (isFav) {
        // optimistic remove
        const favId = favoriteMap[houseManageNo];
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
    [favoriteIds, favoriteMap, isLoggedIn]
  );

  return { favoriteIds, toggle };
}

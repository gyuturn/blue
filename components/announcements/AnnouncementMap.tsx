'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Announcement } from '@/types';
import type { LatLng } from '@/lib/geocode';
import { getDday, getDdayBadgeStyle } from '@/lib/announcements';
import { loadKakaoMaps } from '@/lib/kakaoMaps';
import type { KakaoMap, KakaoMapsApi } from '@/lib/kakaoMaps';
import { getRegionQuery } from '@/lib/regions';
import type { UserPosition } from '@/lib/userLocation';

interface AnnouncementMapProps {
  region: string; // 바뀌면 부모가 key로 다시 마운트한다
  announcements: Announcement[];
  onOpenDetail: (announcement: Announcement) => void;
  userPosition?: UserPosition | null; // 내 위치 (#137)
  // 첫 화면을 내 위치 중심으로 열지 여부. 다른 지역을 고르면 그 지역 핀 범위로 연다 (#145)
  centerOnUser?: boolean;
}

const KOREA_CENTER = { lat: 36.35, lng: 127.8 };

const PIN_STYLE: Record<string, string> = {
  접수중: 'bg-green-600 text-white',
  접수예정: 'bg-blue-600 text-white',
  마감: 'bg-gray-400 text-white',
};

function pinLabel(a: Announcement): string {
  if (a.status === '접수중') return '접수중';
  if (a.status === '마감') return '마감';
  const dday = getDday(a.subscriptionStartDate, a.subscriptionEndDate);
  return dday && dday !== '마감' ? dday : '예정';
}

function createUserDot(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-label', '내 위치');
  el.className = 'w-4 h-4 rounded-full bg-blue-500 border-[3px] border-white shadow-[0_0_0_6px_rgba(59,130,246,0.25)]';
  return el;
}

function createPin(a: Announcement, selected: boolean, onClick: () => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', `${a.complexName} 선택`);
  const color = PIN_STYLE[a.status ?? ''] ?? 'bg-gray-500 text-white';
  el.className = `relative -translate-y-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md whitespace-nowrap transition-transform ${color} ${
    selected ? 'scale-125 ring-2 ring-white' : ''
  }`;
  el.textContent = pinLabel(a);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

type CoordsState = { status: 'loading' } | { status: 'ready'; data: Record<string, LatLng> } | { status: 'error' };

export default function AnnouncementMap({ region, announcements, onOpenDetail, userPosition, centerOnUser = true }: AnnouncementMapProps) {
  // 첫 화면 중심으로 쓸 내 위치 (내 지역/전체 지역일 때만)
  const focusPosition = centerOnUser ? userPosition ?? null : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [maps, setMaps] = useState<KakaoMapsApi | null>(null);
  const [map, setMap] = useState<KakaoMap | null>(null);
  const [sdkError, setSdkError] = useState(false);
  const [coords, setCoords] = useState<CoordsState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 핀 클릭 시 상세 팝업을 바로 연다 (#146). 핀 effect deps에 넣지 않도록 ref로 보관
  const onOpenDetailRef = useRef(onOpenDetail);
  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail;
  }, [onOpenDetail]);
  // 지도 생성 시 최신 내 위치를 읽기 위한 ref (deps에 넣으면 지도가 다시 만들어진다) (#145)
  const userPositionRef = useRef(focusPosition);
  // 내 위치 중심 확대를 한 번만 하기 위한 플래그 (#145)
  const centeredOnUserRef = useRef(false);
  // 사용자가 지도를 직접 드래그했는지 (#145)
  const userMovedRef = useRef(false);

  useEffect(() => {
    userPositionRef.current = focusPosition;
  }, [focusPosition]);

  // 좌표 조회 (지역이 바뀌면 key로 다시 마운트되므로 초기 상태가 loading)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/announcements/coords${getRegionQuery(region)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setCoords(json.enabled ? { status: 'ready', data: json.data ?? {} } : { status: 'error' });
      })
      .catch(() => {
        if (!cancelled) setCoords({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [region]);

  // SDK 로드 + 지도 생성
  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        // 내 위치가 있으면 처음부터 내 위치 중심으로 확대해서 연다 (#145)
        const initial = userPositionRef.current;
        const instance = new api.Map(containerRef.current, {
          center: initial
            ? new api.LatLng(initial.lat, initial.lng)
            : new api.LatLng(KOREA_CENTER.lat, KOREA_CENTER.lng),
          level: initial ? 7 : 13,
        });
        setMaps(api);
        setMap(instance);
      })
      .catch(() => {
        if (!cancelled) setSdkError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const located = useMemo(() => {
    if (coords.status !== 'ready') return [];
    return announcements
      .filter((a) => coords.data[a.id])
      .map((a) => ({ announcement: a, position: coords.data[a.id] }));
  }, [announcements, coords]);

  const unlocatedCount = coords.status === 'ready' ? announcements.length - located.length : 0;
  const selected = located.find((p) => p.announcement.id === selectedId)?.announcement ?? null;

  // 첫 화면 범위 조정
  // - 내 위치가 있으면: 내 위치 중심 확대(level 7)를 한 번만 하고, 이후 핀 데이터가 와도 범위를 바꾸지 않는다 (#145)
  // - 내 위치가 없으면: 전체 핀이 보이게 범위 조정
  useEffect(() => {
    if (!maps || !map) return;
    if (focusPosition) {
      if (!centeredOnUserRef.current) {
        centeredOnUserRef.current = true;
        // 위치가 늦게 왔는데 사용자가 이미 지도를 움직였다면 화면을 빼앗지 않는다
        if (userMovedRef.current) return;
        map.setCenter(new maps.LatLng(focusPosition.lat, focusPosition.lng));
        map.setLevel(7);
      }
      return;
    }
    if (centeredOnUserRef.current) return;
    if (located.length === 0) return;
    if (located.length === 1) {
      const { lat, lng } = located[0].position;
      map.setCenter(new maps.LatLng(lat, lng));
      map.setLevel(6);
      return;
    }
    const bounds = new maps.LatLngBounds();
    located.forEach(({ position }) => bounds.extend(new maps.LatLng(position.lat, position.lng)));
    map.setBounds(bounds, 48, 32, 32, 32);
  }, [maps, map, located, focusPosition]);

  // 내 위치 점
  useEffect(() => {
    if (!maps || !map || !userPosition) return;
    const dot = new maps.CustomOverlay({
      position: new maps.LatLng(userPosition.lat, userPosition.lng),
      content: createUserDot(),
      yAnchor: 0.5,
      zIndex: 5,
    });
    dot.setMap(map);
    return () => dot.setMap(null);
  }, [maps, map, userPosition]);

  const moveToUser = () => {
    if (!maps || !map || !userPosition) return;
    map.setCenter(new maps.LatLng(userPosition.lat, userPosition.lng));
    map.setLevel(7);
  };

  // 핀 그리기 (선택 상태가 바뀌면 다시 그린다)
  useEffect(() => {
    if (!maps || !map) return;
    const overlays = located.map(({ announcement, position }) => {
      const isSelected = announcement.id === selectedId;
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(position.lat, position.lng),
        content: createPin(announcement, isSelected, () => {
          setSelectedId(announcement.id);
          onOpenDetailRef.current(announcement);
        }),
        yAnchor: 1,
        clickable: true,
        zIndex: isSelected ? 10 : 1,
      });
      overlay.setMap(map);
      return overlay;
    });
    return () => overlays.forEach((o) => o.setMap(null));
  }, [maps, map, located, selectedId]);

  // 사용자가 지도를 직접 움직이면 기록한다 (#145)
  useEffect(() => {
    if (!maps || !map) return;
    const markMoved = () => {
      userMovedRef.current = true;
    };
    maps.event.addListener(map, 'dragstart', markMoved);
    return () => maps.event.removeListener(map, 'dragstart', markMoved);
  }, [maps, map]);

  // 지도 빈 곳을 누르면 선택 해제
  useEffect(() => {
    if (!maps || !map) return;
    const clear = () => setSelectedId(null);
    maps.event.addListener(map, 'click', clear);
    return () => maps.event.removeListener(map, 'click', clear);
  }, [maps, map]);

  if (sdkError) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
        지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  const dday = selected ? getDday(selected.subscriptionStartDate, selected.subscriptionEndDate) : '';
  const ddayBadge = getDdayBadgeStyle(dday);

  return (
    <div className="space-y-3">
      <div className="relative isolate overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 shadow-sm">
        <div ref={containerRef} className="h-[60vh] min-h-[320px] w-full" />
        {(!map || coords.status === 'loading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {map && coords.status === 'ready' && located.length === 0 && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-white/95 px-4 py-3 text-center text-xs text-gray-600 shadow">
            지도에 표시할 공고가 없어요
          </div>
        )}
        {map && userPosition && (
          <button
            type="button"
            onClick={moveToUser}
            className="absolute bottom-3 right-3 z-10 rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-md"
          >
            📍 내 위치
          </button>
        )}
        {map && coords.status === 'error' && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-white/95 px-4 py-3 text-center text-xs text-gray-600 shadow">
            공고 위치를 불러오지 못했어요
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600" />접수중</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" />접수예정</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" />마감</span>
      </div>

      {selected ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-sm font-bold leading-snug text-gray-900">{selected.complexName}</p>
            {dday && dday !== '마감' && (
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ddayBadge.className}`}>
                {ddayBadge.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {selected.status ?? '일정 미정'} · {selected.subscriptionStartDate} ~ {selected.subscriptionEndDate}
          </p>
          {selected.address && <p className="mt-1 text-xs text-gray-500 break-keep">{selected.address}</p>}
          <button
            type="button"
            onClick={() => onOpenDetail(selected)}
            className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            상세 보기
          </button>
        </div>
      ) : (
        located.length > 0 && <p className="text-center text-xs text-gray-400">핀을 누르면 공고 상세를 볼 수 있어요</p>
      )}

      {unlocatedCount > 0 && (
        <p className="text-center text-xs text-gray-400">
          위치를 찾지 못한 공고 {unlocatedCount}건은 전체 공고 탭에서 볼 수 있어요
        </p>
      )}
    </div>
  );
}

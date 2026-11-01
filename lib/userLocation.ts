// 브라우저 위치(Geolocation) 도우미 — 클라이언트 전용

export interface UserPosition {
  lat: number;
  lng: number;
}

export type LocationPermission = 'granted' | 'prompt' | 'denied' | 'unsupported';

export async function getLocationPermission(): Promise<LocationPermission> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    return status?.state ?? 'prompt';
  } catch {
    // Permissions API가 없는 브라우저(일부 iOS Safari)는 상태를 모르므로 요청 가능으로 본다
    return 'prompt';
  }
}

// 권한 팝업을 무시하면 getCurrentPosition이 끝나지 않으므로 전체 대기 시간을 둔다
const OVERALL_TIMEOUT_MS = 15000;

export class LocationDeniedError extends Error {}

export function getUserPosition(): Promise<UserPosition> {
  const request = new Promise<UserPosition>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('위치 기능을 지원하지 않는 브라우저예요'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err.code === err.PERMISSION_DENIED ? new LocationDeniedError(err.message) : err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('위치 확인 시간이 초과됐어요')), OVERALL_TIMEOUT_MS),
  );
  return Promise.race([request, timeout]);
}

// 좌표 → 지역 필터 값 (예: "경기도"). 실패하면 null
export async function fetchUserRegion({ lat, lng }: UserPosition): Promise<string | null> {
  try {
    const res = await fetch(`/api/announcements/user-region?lat=${lat.toFixed(2)}&lng=${lng.toFixed(2)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { region?: string | null };
    return json.region ?? null;
  } catch {
    return null;
  }
}

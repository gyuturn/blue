// 카카오맵 JS SDK 로더 + 이 프로젝트에서 쓰는 최소 타입

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
}

export interface KakaoMap {
  setBounds(bounds: KakaoLatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  relayout(): void;
}

export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoMapsApi {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    yAnchor?: number;
    clickable?: boolean;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  event: {
    addListener(target: KakaoMap, type: string, handler: () => void): void;
    removeListener(target: KakaoMap, type: string, handler: () => void): void;
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

const LOAD_TIMEOUT_MS = 10000;

let loader: Promise<KakaoMapsApi> | null = null;

// SDK는 지도 탭을 처음 열 때 한 번만 불러온다.
export function loadKakaoMaps(appKey: string = KAKAO_JS_KEY): Promise<KakaoMapsApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저에서만 사용할 수 있어요'));
  if (!appKey) return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았어요'));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao.maps);

  if (!loader) {
    loader = new Promise<KakaoMapsApi>((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => {
        clearTimeout(timer);
        loader = null;
        script.remove();
        reject(new Error('카카오맵 SDK를 불러오지 못했어요'));
      };
      const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
      script.async = true;
      script.onload = () => {
        const maps = window.kakao?.maps;
        if (!maps) return fail();
        maps.load(() => {
          clearTimeout(timer);
          resolve(maps);
        });
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }
  return loader;
}

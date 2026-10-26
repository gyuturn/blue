// 앱 설치(PWA/스토어 패키징) 요건을 맞추기 위한 최소 서비스 워커 (#59)
// 캐시하지 않고 네트워크로 그대로 보내므로 배포 후 옛 화면이 남는 문제가 없다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

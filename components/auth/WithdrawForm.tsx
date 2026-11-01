'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CALC_DRAFT_KEY, LAST_SCORE_KEY, SYNC_DISMISSED_KEY } from '@/lib/scoreStorage';
import { LEGACY_REGION_KEY } from '@/lib/regions';

// 이 기기에 남은 개인 데이터 — 탈퇴 성공 후 함께 지운다
const DEVICE_KEYS = [LAST_SCORE_KEY, CALC_DRAFT_KEY, SYNC_DISMISSED_KEY, 'blue_favorites', LEGACY_REGION_KEY];

const DELETED_ITEMS = [
  '저장된 청약 가점 계산 기록',
  '즐겨찾기한 공고',
  '이용약관·개인정보 처리방침 동의 기록',
  '카카오 계정 연결 (다시 쓰려면 새로 가입해요)',
  '이 기기에 저장된 점수·입력 기록',
];

function clearDeviceData() {
  try {
    for (const key of DEVICE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // 저장소 접근이 막힌 환경 — 서버 쪽 삭제는 이미 끝났으므로 무시한다
  }
}

export default function WithdrawForm({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!confirmed || loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/withdraw', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !body?.ok) {
        setErrorMessage(body?.message ?? '탈퇴 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
        setLoading(false);
        return;
      }
      clearDeviceData();
      alert('탈퇴가 완료됐어요. 그동안 이용해 주셔서 감사합니다.');
      window.location.href = '/';
    } catch {
      setErrorMessage('네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">회원탈퇴</h1>
      <p className="mt-1 text-sm text-gray-500">
        {nickname}님, 탈퇴하면 아래 정보가 바로 삭제되고 되돌릴 수 없어요.
      </p>

      <ul className="mt-6 space-y-2 rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-700 shadow-sm">
        {DELETED_ITEMS.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-red-500" aria-hidden>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 px-1 text-xs leading-relaxed text-gray-400">
        다시 가입할 수 있지만 지워진 기록은 복구되지 않아요.
      </p>

      <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4 accent-red-600"
        />
        <span className="text-sm text-gray-700">위 내용을 확인했고, 탈퇴에 동의합니다</span>
      </label>

      {errorMessage && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        onClick={handleWithdraw}
        disabled={!confirmed || loading}
        className={`mt-4 w-full rounded-xl py-4 text-base font-bold transition-all ${
          confirmed && !loading
            ? 'bg-red-600 text-white shadow-md hover:bg-red-700'
            : 'cursor-not-allowed bg-gray-200 text-gray-400'
        }`}
      >
        {loading ? '처리 중...' : '탈퇴하기'}
      </button>
      <button
        onClick={() => router.back()}
        disabled={loading}
        className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
      >
        취소
      </button>
    </div>
  );
}

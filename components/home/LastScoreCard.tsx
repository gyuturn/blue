'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useLocalStorageItem } from '@/hooks/useLocalStorage';
import {
  LAST_SCORE_KEY,
  consumeSyncAfterLogin,
  parseSavedScore,
  resultUrl,
  scorePostBody,
  toStoredScoreData,
  type SavedScoreRecord,
} from '@/lib/scoreStorage';

interface Props {
  isLoggedIn: boolean;
  serverRecord: Pick<SavedScoreRecord, 'input' | 'savedAt'> | null;
}

export default function LastScoreCard({ isLoggedIn, serverRecord }: Props) {
  const router = useRouter();
  const [localRaw, setLocalRaw] = useLocalStorageItem(LAST_SCORE_KEY);
  const localRecord = useMemo(() => parseSavedScore(localRaw), [localRaw]);
  const syncedRef = useRef(false);

  // 결과 화면에서 "다른 기기에서도 보기"로 로그인한 경우에만 이 기기 기록을 계정에 올린다 (공용 기기 보호)
  useEffect(() => {
    if (!isLoggedIn || !localRecord || syncedRef.current) return;
    syncedRef.current = true;
    if (!consumeSyncAfterLogin()) return;
    if (serverRecord && serverRecord.savedAt >= localRecord.savedAt) return;
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: scorePostBody(localRecord.input),
    })
      .then((res) => {
        if (res.ok) router.refresh();
      })
      .catch(() => {});
  }, [isLoggedIn, localRecord, serverRecord, router]);

  const record =
    localRecord && (!serverRecord || localRecord.savedAt >= serverRecord.savedAt)
      ? { ...localRecord, source: 'device' as const }
      : serverRecord
        ? { ...serverRecord, source: 'account' as const }
        : null;

  if (!record) return null;

  const { result, input } = toStoredScoreData(record.input, record.savedAt);
  // 서버(UTC)와 브라우저 시간대가 달라도 같은 날짜가 나오도록 고정한다
  const dateLabel = new Date(record.savedAt).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  });

  const handleClear = () => {
    if (!window.confirm('이 기기에 저장된 청약 점수를 지울까요?')) return;
    setLocalRaw(null);
    try {
      sessionStorage.removeItem('scoreData');
    } catch {}
  };

  return (
    <section className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-500">내 마지막 청약 가점</p>
        {record.source === 'device' && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600">
            지우기
          </button>
        )}
      </div>
      <p className="text-gray-900">
        <span className="text-4xl font-bold tabular-nums">{result.totalScore}</span>
        <span className="text-base text-gray-400 ml-1">/ 84점</span>
      </p>
      <p className="text-sm text-gray-500 mt-1">
        무주택 {result.homelessScore} · 가족 {result.dependentsScore} · 통장 {result.subscriptionScore}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {dateLabel} 계산 · {record.source === 'device' ? '이 기기에 저장' : '내 계정에 저장'}
      </p>
      <div className="flex gap-2 mt-4">
        <Link
          href={resultUrl(input, true)}
          className="flex-1 text-center py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
        >
          결과 다시 보기
        </Link>
        <Link
          href="/calculator"
          className="flex-1 text-center py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          다시 계산하기
        </Link>
      </div>
    </section>
  );
}

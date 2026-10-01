import type { Announcement, StoredScoreData } from '@/types';
import { getCompetitionAnalysis, getSpecialSupplyBadges } from '@/lib/announcements';

const REASON_ICON = {
  plus: { mark: '+', className: 'text-green-600' },
  minus: { mark: '−', className: 'text-red-500' },
  info: { mark: '·', className: 'text-gray-400' },
} as const;

// 공고에 있는 특별공급 유형 (내 자격이 되는 유형은 강조)
export function SpecialSupplyChips({
  announcement,
  scoreData,
}: {
  announcement: Announcement;
  scoreData: StoredScoreData | null;
}) {
  const badges = getSpecialSupplyBadges(announcement, scoreData?.specialSupply);
  const counts = announcement.specialSupplyCounts;
  if (!counts || badges.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 mb-1">
        특별공급
        {counts.generalTotal > 0 && (
          <span className="font-normal text-gray-400"> · 일반공급 {counts.generalTotal.toLocaleString()}세대</span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <span
            key={b.key}
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              b.matched ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}
          >
            {b.matched && '✓ '}
            {b.name} {b.count.toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  );
}

// 경쟁 라벨 + 그렇게 판단한 이유
export function CompetitionSummary({
  announcement,
  scoreData,
  maxReasons,
}: {
  announcement: Announcement;
  scoreData: StoredScoreData;
  maxReasons?: number;
}) {
  const analysis = getCompetitionAnalysis(announcement, scoreData);
  const reasons = maxReasons ? analysis.reasons.slice(0, maxReasons) : analysis.reasons;
  const hidden = analysis.reasons.length - reasons.length;

  return (
    <div>
      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${analysis.style}`}>
        {analysis.label}
      </span>
      <ul className="mt-1.5 space-y-0.5">
        {reasons.map((r) => (
          <li key={r.text} className="flex gap-1.5 text-[11px] leading-snug text-gray-600">
            <span className={`flex-shrink-0 w-2 font-bold ${REASON_ICON[r.tone].className}`}>
              {REASON_ICON[r.tone].mark}
            </span>
            <span className="min-w-0 break-words">{r.text}</span>
          </li>
        ))}
        {hidden > 0 && <li className="pl-3.5 text-[11px] text-gray-400">외 {hidden}개 — 눌러서 자세히 보기</li>}
      </ul>
    </div>
  );
}

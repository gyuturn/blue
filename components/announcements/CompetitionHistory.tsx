'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import type { Announcement, StoredScoreData } from '@/types';
import {
  AREA_BUCKET_LABEL,
  CHANCE_META,
  defaultSupplyTab,
  formatCompetitionRate,
  getChanceSuggestions,
  judgeChance,
  passedUnits,
  SPECIAL_SUPPLY_HOW,
  SPECIAL_SUPPLY_LABEL,
  SPECIAL_SUPPLY_TYPES,
  type BucketStats,
  type SpecialSupplyType,
  type SpecialTypeResult,
  type SpecialTypeStats,
  type UnitResult,
} from '@/lib/competitionHistory';

interface HistoryData {
  region: string;
  months: number;
  complexCount: number;
  own: UnitResult[];
  stats: BucketStats[];
  // 캐시된 이전 응답에는 없을 수 있다
  special?: SpecialTypeResult[];
  specialComplexCount?: number;
  specialStats?: SpecialTypeStats[];
}

type SupplyTab = SpecialSupplyType | 'general';

type HistoryState = { status: 'loading' } | { status: 'off' } | { status: 'ready'; data: HistoryData };

const MAX_SCORE = 84;

// 목업·임시 id(mock-001, api-0)는 청약홈 결과가 없으므로 조회하지 않는다
function useCompetitionHistory(houseManageNo: string, region: string): HistoryState {
  const key = /^\d+$/.test(houseManageNo) ? `${houseManageNo}|${region}` : '';
  const [result, setResult] = useState<{ key: string; state: HistoryState } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const params = new URLSearchParams({ houseManageNo, region });
    fetch(`/api/announcements/competition?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const state: HistoryState = json.enabled ? { status: 'ready', data: json } : { status: 'off' };
        setResult({ key, state });
      })
      .catch(() => !cancelled && setResult({ key, state: { status: 'off' } }));
    return () => {
      cancelled = true;
    };
  }, [key, houseManageNo, region]);

  if (!key) return { status: 'off' };
  return result?.key === key ? result.state : { status: 'loading' };
}

const formatRate = (u: UnitResult) =>
  u.rate !== null ? formatCompetitionRate(u.rate) : u.shortfall !== null ? `미달 ${u.shortfall}세대` : '-';

// 과거 경쟁률·당첨선으로 본 내 가능성 — 공급 유형(일반공급 / 특별공급 유형별) 탭으로 나눠 보여준다.
// 일반공급: 이 공고 실제 결과(마감 시) + 같은 시·도 최근 1년 민영 단지 당첨선 / 특별공급: 유형별 경쟁률
export function CompetitionHistory({
  announcement,
  scoreData,
}: {
  announcement: Announcement;
  scoreData: StoredScoreData | null;
}) {
  const state = useCompetitionHistory(announcement.id, announcement.region);
  const [picked, setPicked] = useState<SupplyTab | null>(null);

  if (state.status === 'off') return null;
  if (state.status === 'loading') {
    return (
      <div className="space-y-2 mb-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const { data } = state;
  const ownWithResult = data.own.filter((u) => u.lowest !== null || u.rate !== null || u.shortfall !== null);
  // 접수 전(배정 세대만 있는) 유형은 보여줄 경쟁률이 없어 뺀다
  const special = (data.special ?? []).filter((r) => r.requests > 0);
  const specialStats = data.specialStats ?? [];
  const hasGeneral = ownWithResult.length > 0 || data.stats.length > 0;
  const specialTypes = SPECIAL_SUPPLY_TYPES.filter(
    // 기관추천은 지역 경쟁률을 보여주지 않으므로 이 단지 결과가 있을 때만 탭을 둔다
    (t) => special.some((r) => r.type === t) || (t !== 'institution' && specialStats.some((r) => r.type === t)),
  );
  if (!hasGeneral && specialTypes.length === 0) return null;

  const mySpecial = scoreData?.specialSupply;
  const preferred = defaultSupplyTab(specialTypes, mySpecial);
  const fallback: SupplyTab = hasGeneral || preferred !== 'general' ? preferred : specialTypes[0];
  const tab: SupplyTab = picked && (picked === 'general' ? hasGeneral : specialTypes.includes(picked)) ? picked : fallback;
  const tabs: SupplyTab[] = [...(hasGeneral ? (['general'] as const) : []), ...specialTypes];
  const isMine = (t: SupplyTab) => t !== 'general' && (t === 'firstHome' || t === 'newlyWed' || t === 'multiChild') && !!mySpecial?.[t];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 mb-4">
      <p className="text-xs font-bold text-gray-800">
        과거 경쟁률·당첨선으로 본 내 가능성{' '}
        <Tooltip
          term="공급 유형별 경쟁률"
          definition="청약은 일반공급과 특별공급(생애최초·신혼부부 등)을 따로 뽑아서 경쟁률도 따로예요. 탭을 눌러 유형별로 확인하세요. 일반공급 경쟁률은 1순위 해당지역 신청자 수 ÷ 공급 세대수, 특별공급 경쟁률은 전체 접수 건수 ÷ 배정 세대수예요. 최저 당첨가점은 일반공급 가점제로 당첨된 사람 중 가장 낮은 점수예요."
        >
          <span className="text-blue-400 font-normal">ⓘ</span>
        </Tooltip>
      </p>

      {tabs.length > 1 && (
        <div className="mt-2.5 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="공급 유형">
          {tabs.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPicked(t)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : isMine(t)
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}
              >
                {isMine(t) && '✓ '}
                {t === 'general' ? '일반공급' : SPECIAL_SUPPLY_LABEL[t]}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'general' ? (
        <GeneralPanel
          data={data}
          ownWithResult={ownWithResult}
          announcement={announcement}
          scoreData={scoreData}
        />
      ) : (
        <SpecialPanel
          type={tab}
          own={special.find((r) => r.type === tab)}
          stats={specialStats.find((r) => r.type === tab)}
          region={data.region}
          months={data.months}
          mine={isMine(tab)}
        />
      )}

      <p className="mt-2 text-[10px] text-gray-400 leading-snug">
        청약홈 공개 결과로 추정한 참고용 정보예요. 입지·분양가·추첨 물량에 따라 실제 결과는 달라질 수 있어요.
      </p>
    </div>
  );
}

// 일반공급 탭 — 1순위 경쟁률 + 가점제 당첨선 + 내 가점 판정
function GeneralPanel({
  data,
  ownWithResult,
  announcement,
  scoreData,
}: {
  data: HistoryData;
  ownWithResult: UnitResult[];
  announcement: Announcement;
  scoreData: StoredScoreData | null;
}) {
  const myScore = scoreData?.result.totalScore;
  const isPublic = announcement.supplyKind === '국민';
  const judgeable = myScore !== undefined && !isPublic;
  const suggestions = judgeable ? getChanceSuggestions(myScore, data.stats, scoreData?.specialSupply) : [];

  return (
    <>
      <p className="mt-2 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-700">일반공급</span> · 경쟁률은 1순위 해당지역, 당첨선은 가점제 기준이에요
      </p>

      {isPublic && (
        <p className="mt-1.5 text-[11px] text-gray-500">
          공공분양은 가점이 아니라 청약통장 납입 횟수 순으로 뽑아요. 아래 당첨선은 같은 지역 민영 단지 참고용이에요.
        </p>
      )}

      {ownWithResult.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">이 단지 실제 결과</p>
          <div className="space-y-1.5">
            {ownWithResult.map((u) => {
              const passed = judgeable && u.lowest !== null && myScore >= u.lowest;
              return (
                <div
                  key={u.houseType}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] ${passed ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}
                >
                  <span className="font-semibold text-gray-800">{u.houseType}</span>
                  <span className="ml-2">
                    1순위 경쟁률{' '}
                    <span className={(u.rate !== null && u.rate < 1) || u.shortfall !== null ? 'font-semibold text-green-600' : undefined}>
                      {formatRate(u)}
                    </span>
                  </span>
                  {u.lowest !== null && (
                    <span className="ml-2">
                      당첨가점 최저 {u.lowest}
                      {u.average !== null && ` · 평균 ${u.average}`}점
                    </span>
                  )}
                  {passed && <span className="ml-1 font-semibold">✓ 내 가점 이상</span>}
                </div>
              );
            })}
          </div>
          {judgeable && passedUnits(myScore, ownWithResult).length === 0 && ownWithResult.some((u) => u.lowest !== null) && (
            <p className="mt-1.5 text-[11px] text-gray-500">내 가점 {myScore}점은 이 단지 당첨선보다 낮았어요</p>
          )}
        </div>
      )}

      {data.stats.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-gray-500 mb-2">
            최근 {data.months}개월 {data.region} 민영 {data.complexCount}개 단지 결과 기준
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 mb-2">
            {myScore !== undefined && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />내 가점 {myScore}점
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-0.5 bg-blue-500" />당첨선 중앙값
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-full bg-blue-100" />당첨선 범위
            </span>
          </div>
          <div className="space-y-3">
            {data.stats.map((s) => (
              <BucketRow key={s.bucket} stats={s} myScore={myScore} judge={judgeable} />
            ))}
          </div>
        </div>
      )}

      {!scoreData && (
        <Link href="/calculator" className="mt-3 block text-[11px] font-semibold text-blue-600">
          가점을 계산하면 내 가능성을 알려드려요 →
        </Link>
      )}

      {suggestions.length > 0 && (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
          <p className="text-[11px] font-bold text-blue-800 mb-1">💡 제안</p>
          <ul className="space-y-0.5">
            {suggestions.map((s) => (
              <li key={s} className="text-[11px] leading-snug text-blue-900">· {s}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

const rateClass = (rate: number | null) => (rate !== null && rate < 1 ? 'font-semibold text-green-600' : 'font-semibold text-gray-800');
const rateText = (rate: number | null) => (rate !== null ? formatCompetitionRate(rate) : '접수 없음');

// 특별공급 탭 — 가점과 별개라 막대 없이 유형별 경쟁률만
function SpecialPanel({
  type,
  own,
  stats,
  region,
  months,
  mine,
}: {
  type: SpecialSupplyType;
  own?: SpecialTypeResult;
  stats?: SpecialTypeStats;
  region: string;
  months: number;
  mine: boolean;
}) {
  const label = SPECIAL_SUPPLY_LABEL[type];
  // 기관추천은 기관이 대상자를 정해 추천하는 방식이라 경쟁률 대신 세대·추천 건수만 보여준다
  const showRate = type !== 'institution';
  return (
    <>
      <p className="mt-2 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-700">{label} 특별공급</span> · 가점과 별개로 뽑아요. {SPECIAL_SUPPLY_HOW[type]}
      </p>
      {mine && <p className="mt-1 text-[11px] font-semibold text-purple-700">✓ 내가 입력한 정보로는 자격 가능성이 있는 유형이에요 (소득·자산 기준은 공고에서 확인하세요)</p>}

      {own && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">이 단지 실제 결과</p>
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600">
            <p>
              {label} {own.supply.toLocaleString()}세대 · {own.requests.toLocaleString()}건 {showRate ? '접수' : '추천'}
              {own.localRequests !== null && own.localRequests > 0 && (
                <span className="text-gray-400"> (해당지역 {own.localRequests.toLocaleString()}건)</span>
              )}
            </p>
            {showRate && (
              <p className="mt-0.5">
                경쟁률 <span className={rateClass(own.rate)}>{rateText(own.rate)}</span>
              </p>
            )}
          </div>
          {own.units.length > 1 && (
            <div className="mt-1.5 space-y-1">
              {own.units.map((u) => (
                <div key={u.houseType} className="flex justify-between gap-2 px-2.5 text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-800">{u.houseType}</span>
                  <span>
                    {u.supply}세대 · {u.requests.toLocaleString()}건
                    {showRate && (
                      <>
                        {' · '}
                        <span className={rateClass(u.rate)}>{rateText(u.rate)}</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {stats && showRate && (
        <div className="mt-3">
          <p className="text-[11px] text-gray-500 mb-1.5">
            최근 {months}개월 {region} 민영 {stats.complexCount}개 단지 {label} 경쟁률
          </p>
          <div className="rounded-lg border border-gray-100 px-2.5 py-2 text-[11px] text-gray-600">
            중앙값 <span className={rateClass(stats.rateMedian)}>{formatCompetitionRate(stats.rateMedian)}</span>
            <span className="text-gray-400">
              {' '}
              (낮게는 {formatCompetitionRate(stats.rateMin)} ~ 높게는 {formatCompetitionRate(stats.rateMax)})
            </span>
          </div>
        </div>
      )}

      {showRate && (
        <p className="mt-2 text-[10px] text-gray-400 leading-snug">
          특별공급 경쟁률 = 전체 접수 건수(해당지역·기타지역 합) ÷ 배정 세대수예요. 해당지역 거주자가 먼저 뽑혀요.
        </p>
      )}
    </>
  );
}

// myScore는 막대 위치 표시용, judge는 판정 칩·문구 표시 여부 (공공분양은 가점제가 아니라 위치만 보여준다)
function BucketRow({ stats, myScore, judge }: { stats: BucketStats; myScore?: number; judge: boolean }) {
  const chance = myScore !== undefined ? judgeChance(myScore, stats) : null;
  const markerScore = myScore !== undefined ? Math.min(Math.max(myScore, 0), MAX_SCORE) : undefined;
  const pct = (n: number) => `${(n / MAX_SCORE) * 100}%`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-800">{AREA_BUCKET_LABEL[stats.bucket]}</span>
        {judge && chance && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${CHANCE_META[chance.level].style}`}>
            {CHANCE_META[chance.level].label}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-600 mt-0.5">
        최저 당첨가점 {stats.lowestMedian}점 ({stats.lowestMin}~{stats.lowestMax})
        {stats.rateMedian !== null && (
          <>
            {' · 1순위 경쟁률 '}
            <span className={stats.rateMedian < 1 ? 'font-semibold text-green-600' : undefined}>
              {formatCompetitionRate(stats.rateMedian)}
            </span>
          </>
        )}
        <span className="text-gray-400"> · {stats.complexCount}개 단지</span>
      </p>
      <div className="relative mt-1.5 h-2 rounded-full bg-gray-100" aria-hidden>
        <div
          className="absolute h-2 rounded-full bg-blue-100"
          style={{ left: pct(stats.lowestMin), width: pct(stats.lowestMax - stats.lowestMin) }}
        />
        <div className="absolute h-2 w-0.5 bg-blue-500" style={{ left: pct(stats.lowestMedian) }} />
        {markerScore !== undefined && (
          <div
            className="absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-orange-500 shadow"
            style={{ left: pct(markerScore) }}
          />
        )}
      </div>
      <div className="relative mt-0.5 h-3.5 text-[10px] text-gray-400" aria-hidden>
        {!(markerScore !== undefined && markerScore < 14) && <span className="absolute left-0">0</span>}
        {!(markerScore !== undefined && markerScore > 70) && <span className="absolute right-0">84점</span>}
        {markerScore !== undefined && (
          // 양끝에서는 라벨이 잘리지 않도록 정렬 기준을 바꾼다
          <span
            className={`absolute whitespace-nowrap font-semibold text-orange-600 ${
              markerScore < 14 ? '' : markerScore > 70 ? '-translate-x-full' : '-translate-x-1/2'
            }`}
            style={{ left: pct(markerScore) }}
          >
            내 {myScore}점
          </span>
        )}
      </div>
      {chance && myScore !== undefined && (
        <p className="text-[11px] text-gray-500 mt-0.5">
          {judge ? '' : '참고: 민영 기준으로 보면 '}
          {chance.total}개 단지 중 {chance.passCount}곳은 내 가점({myScore}점)으로 당첨권인 주택형이 있었어요
          {!judge && chance.level === 'unknown' && ' (표본이 적어 참고만 하세요)'}
        </p>
      )}
    </div>
  );
}

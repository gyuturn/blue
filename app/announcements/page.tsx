'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Disclaimer from '@/components/Disclaimer';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { Announcement, StoredScoreData } from '@/types';
import { getDday, getDdayBadgeStyle, getScoreTierLabel, getGeneralSupplyLabel, getSpecialSupplyLabels } from '@/lib/announcements';
import type { AnnouncementDetail } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';
import type { SessionUser } from '@/types/auth';
import { calculateTotalScore, calculateSpecialSupply } from '@/lib/calculator';

const REGION_OPTIONS = [
  '전체',
  '서울특별시',
  '경기도',
  '인천광역시',
  '부산광역시',
  '대구광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

const tierBadgeStyle: Record<string, string> = {
  S: 'bg-yellow-100 text-yellow-700',
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-gray-100 text-gray-700',
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const [scoreData, setScoreData] = useState<StoredScoreData | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [isMock, setIsMock] = useState(false);
  const [hideExpired, setHideExpired] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [scoreFromDB, setScoreFromDB] = useState(false);

  const authReady = sessionUser !== undefined;
  const { favoriteIds, toggle: toggleFavorite } = useFavorites(authReady ? !!sessionUser : null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setSessionUser(u))
      .catch(() => setSessionUser(null));
  }, []);

  useEffect(() => {
    const loadScore = async () => {
      // 1) sessionStorage 우선
      try {
        const raw = sessionStorage.getItem('scoreData');
        if (raw) {
          setScoreData(JSON.parse(raw));
          setAuthChecked(true);
          return;
        }
      } catch {}

      // 2) 로그인 상태면 DB에서 최근 점수 로드
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const latestRes = await fetch('/api/scores/latest');
          if (latestRes.ok) {
            const latest = await latestRes.json();
            const input = latest.inputSnapshot as StoredScoreData['input'];
            const scoreData: StoredScoreData = {
              input,
              result: calculateTotalScore(input),
              specialSupply: calculateSpecialSupply(input),
              savedAt: new Date(latest.createdAt).getTime(),
            };
            sessionStorage.setItem('scoreData', JSON.stringify(scoreData));
            setScoreData(scoreData);
            setScoreFromDB(true);
            setAuthChecked(true);
            return;
          }
        }
      } catch {}

      // 3) 둘 다 없으면 계산기로
      router.push('/calculator');
    };

    loadScore();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const regionParam =
          selectedRegion === '전체' ? '' : `?region=${encodeURIComponent(selectedRegion)}`;
        const res = await fetch(`/api/announcements${regionParam}`);
        const json = await res.json();
        setAnnouncements(json.data ?? []);
        setIsMock(json.isMock ?? false);
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedRegion]);

  const baseAnnouncements = hideExpired
    ? announcements.filter(a => a.status !== '마감')
    : announcements;

  const filteredAnnouncements = activeTab === 'favorites'
    ? baseAnnouncements.filter(a => favoriteIds.includes(a.id))
    : baseAnnouncements;

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            홈으로
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">청약 공고</h1>
              <p className="text-gray-500 text-sm mt-1">최신 청약 공고를 확인하세요</p>
            </div>
            {!loading && (
              isMock ? (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  샘플 데이터
                </span>
              ) : (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  실시간 데이터
                </span>
              )
            )}
          </div>
        </div>

        {/* 저장된 점수 사용 배너 */}
        {scoreFromDB && scoreData && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">📋</span>
              <span className="text-amber-700 font-medium">
                {new Date(scoreData.savedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 저장된 점수로 보는 중
              </span>
            </div>
            <button onClick={() => router.push('/calculator')} className="text-xs text-amber-700 font-semibold underline">
              재계산
            </button>
          </div>
        )}

        {/* Score Summary Bar */}
        {scoreData && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">내 가점</span>
              <span className="text-lg font-bold text-blue-700">{scoreData.result.totalScore}점</span>
              <span className="text-xs text-gray-500">/ 84점</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierBadgeStyle[scoreData.result.tier]}`}>
                {scoreData.result.tier}등급
              </span>
            </div>
            <button
              onClick={() => router.push('/calculator')}
              className="text-xs text-blue-600 underline"
            >
              재계산
            </button>
          </div>
        )}

        {/* 전체 / 즐겨찾기 탭 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            전체 공고
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'favorites' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            <span>♥</span> 즐겨찾기 {favoriteIds.length > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'favorites' ? 'bg-white/20' : 'bg-red-100 text-red-500'}`}>{favoriteIds.length}</span>}
          </button>
        </div>

        {/* Region Filter & Expired Toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">지역 필터</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">마감 포함</span>
              <button
                onClick={() => setHideExpired(!hideExpired)}
                className={`relative w-10 h-5 rounded-full transition-colors ${hideExpired ? 'bg-gray-300' : 'bg-blue-500'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hideExpired ? 'left-0.5' : 'left-5'}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {REGION_OPTIONS.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedRegion === region
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* Mock data notice */}
        {!loading && isMock && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              API 키를 설정하면 실제 데이터를 확인할 수 있어요. 현재는 샘플 데이터를 표시하고 있습니다.
              실제 공고는{' '}
              <a
                href="https://www.applyhome.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                청약홈
              </a>
              에서 확인하세요.
            </p>
          </div>
        )}

        {/* Announcements List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            {activeTab === 'favorites' ? (
              <>
                <div className="text-4xl mb-3">♡</div>
                <p className="text-gray-500 font-medium">즐겨찾기한 공고가 없어요</p>
                <p className="text-gray-400 text-sm mt-1">마음에 드는 공고의 하트를 눌러보세요</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">해당 지역 공고가 없습니다</p>
                <p className="text-gray-400 text-sm mt-1">다른 지역을 선택해 보세요</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((item) => (
              <AnnouncementCard
                key={item.id}
                announcement={item}
                scoreData={scoreData}
                onSelect={setSelectedAnnouncement}
                isFavorite={favoriteIds.includes(item.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}

        {/* Total count */}
        {!loading && filteredAnnouncements.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            총 {filteredAnnouncements.length}건의 공고
          </p>
        )}

        <Disclaimer />
      </div>

      {selectedAnnouncement && (
        <BottomSheet isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)}>
          <AnnouncementDetail announcement={selectedAnnouncement} scoreData={scoreData} />
        </BottomSheet>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;

  const styles: Record<string, string> = {
    '접수중': 'bg-green-100 text-green-700',
    '접수예정': 'bg-blue-100 text-blue-700',
    '마감': 'bg-gray-100 text-gray-500',
  };

  const cls = styles[status] ?? 'bg-gray-100 text-gray-500';

  return (
    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function AnnouncementCard({
  announcement, scoreData, onSelect, isFavorite, onToggleFavorite,
}: {
  announcement: Announcement;
  scoreData: StoredScoreData | null;
  onSelect: (a: Announcement) => void;
  isFavorite: boolean;
  onToggleFavorite: (a: Announcement) => void;
}) {
  const dday = getDday(announcement.subscriptionStartDate, announcement.subscriptionEndDate);
  const ddayBadge = getDdayBadgeStyle(dday);

  const handleCardClick = () => {
    onSelect(announcement);
  };

  const tierLabel = scoreData ? getScoreTierLabel(scoreData.result.tier) : null;
  const generalSupply = scoreData ? getGeneralSupplyLabel(scoreData.input) : null;
  const specialLabels = scoreData ? getSpecialSupplyLabels(scoreData.specialSupply, announcement.specialSupplyTypes) : [];

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-100 transition-all"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-sm leading-snug flex-1">
            {announcement.complexName}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge status={announcement.status} />
            {dday && dday !== '마감' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ddayBadge.className}`}>
                {ddayBadge.label}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(announcement); }}
              className="text-lg leading-none transition-transform active:scale-90"
              aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              {isFavorite ? '♥' : '♡'}
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-14 flex-shrink-0">건설사</span>
            <span className="font-medium">{announcement.builder}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-14 flex-shrink-0">지역</span>
            <span>{announcement.region}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-14 flex-shrink-0">유형</span>
            <span>{announcement.houseType}</span>
          </div>
          {announcement.totalHouseholds !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-14 flex-shrink-0">세대수</span>
              <span>{announcement.totalHouseholds.toLocaleString()}세대</span>
            </div>
          )}
          {announcement.subscriptionStartDate && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-14 flex-shrink-0">접수기간</span>
              <span>
                {announcement.subscriptionStartDate} ~{' '}
                {announcement.subscriptionEndDate}
              </span>
            </div>
          )}
        </div>
      </div>

      {scoreData && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {tierLabel && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierLabel.style}`}>
              {tierLabel.text}
            </span>
          )}
          {generalSupply && !generalSupply.eligible && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-500">
              {generalSupply.text}
            </span>
          )}
          {specialLabels.map((label) => (
            <span key={label} className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">
              {label}
            </span>
          ))}
        </div>
      )}

      {announcement.pdfUrl && (
        <div className="border-t border-gray-100 px-4 py-3">
          <a
            href={announcement.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            공고문 바로가기 (청약홈)
          </a>
        </div>
      )}
    </div>
  );
}

function AnnouncementDetail({ announcement, scoreData }: { announcement: Announcement; scoreData: StoredScoreData | null }) {
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(false);

  const dday = getDday(announcement.subscriptionStartDate, announcement.subscriptionEndDate);
  const ddayBadge = getDdayBadgeStyle(dday);

  const tierLabel = scoreData ? getScoreTierLabel(scoreData.result.tier) : null;
  const generalSupply = scoreData ? getGeneralSupplyLabel(scoreData.input) : null;
  const specialLabels = scoreData ? getSpecialSupplyLabels(scoreData.specialSupply, announcement.specialSupplyTypes) : [];

  useEffect(() => {
    setDetailLoading(true);
    setDetailError(false);
    const houseManageNo = announcement.id;
    const pblancNo = announcement.pblancNo ?? announcement.id;
    fetch(`/api/announcements/detail?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setDetail(json.data);
        else setDetailError(true);
      })
      .catch(() => setDetailError(true))
      .finally(() => setDetailLoading(false));
  }, [announcement.id, announcement.pblancNo]);

  return (
    <div className="px-5 pb-8">
      {/* 단지명 + 상태 */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold text-gray-900 leading-snug flex-1">{announcement.complexName}</h2>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <StatusBadge status={announcement.status} />
          {dday && dday !== '마감' && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ddayBadge.className}`}>
              {ddayBadge.label}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">{announcement.builder} · {announcement.region}</p>

      {/* 내 가점 매칭 */}
      {scoreData && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tierLabel && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierLabel.style}`}>
              {tierLabel.text}
            </span>
          )}
          {generalSupply && !generalSupply.eligible && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-500">
              {generalSupply.text}
            </span>
          )}
          {specialLabels.map((label) => (
            <span key={label} className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* 청약홈 상세 데이터 */}
      {detailLoading ? (
        <div className="space-y-3 mb-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : detailError || !detail ? (
        /* 스크래핑 실패 시 기존 API 데이터로 폴백 */
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
          {announcement.subscriptionStartDate && (
            <InfoRow label="청약 접수" value={`${announcement.subscriptionStartDate} ~ ${announcement.subscriptionEndDate}`} />
          )}
          {announcement.announcementDate && (
            <InfoRow label="공고일" value={announcement.announcementDate} />
          )}
          <InfoRow label="주택 유형" value={announcement.houseType} />
          {announcement.totalHouseholds !== undefined && (
            <InfoRow label="총 세대수" value={`${announcement.totalHouseholds.toLocaleString()}세대`} />
          )}
        </div>
      ) : (
        <>
          {/* 기본 정보 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
            <SectionLabel>기본 정보</SectionLabel>
            {detail.location && <InfoRow label="위치" value={detail.location} />}
            {detail.totalSupply && <InfoRow label="공급 규모" value={detail.totalSupply} />}
            {detail.constructor && <InfoRow label="시공사" value={detail.constructor} />}
            {detail.operator && <InfoRow label="시행사" value={detail.operator} />}
            {detail.moveInDate && <InfoRow label="입주 예정" value={detail.moveInDate} highlight />}
          </div>

          {/* 청약 일정 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <SectionLabel>청약 일정</SectionLabel>
            <div className="space-y-3 mt-3">
              {detail.announcementDate && <InfoRow label="모집공고일" value={detail.announcementDate} />}
              {detail.schedule.map((s) => (
                <div key={s.type} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-400 w-20 flex-shrink-0 text-xs pt-0.5">{s.type}</span>
                  <div>
                    <p className="text-gray-800 font-medium text-xs">{s.localDate || s.otherDate}</p>
                    {s.place && <p className="text-gray-400 text-xs">{s.place}</p>}
                  </div>
                </div>
              ))}
              {detail.winnerDate && <InfoRow label="당첨자 발표" value={detail.winnerDate} highlight />}
              {detail.contractPeriod && <InfoRow label="계약일" value={detail.contractPeriod} />}
            </div>
          </div>

          {/* 주택형별 공급 */}
          {detail.units.length > 0 && (
            <div className="mb-4">
              <SectionLabel>주택형별 공급</SectionLabel>
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">주택형</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-semibold">세대수</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-semibold">분양가(만원)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detail.units.map((u, i) => (
                      <tr key={i} className="bg-white">
                        <td className="px-3 py-2.5 text-gray-800 font-medium">{u.type}</td>
                        <td className="px-3 py-2.5 text-gray-700 text-right">{u.totalCount || '-'}</td>
                        <td className="px-3 py-2.5 text-gray-700 text-right">{u.price || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 청약홈 바로가기 */}
      <a
        href={`https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${announcement.id}&pblancNo=${announcement.pblancNo ?? announcement.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        청약홈에서 직접 보기
      </a>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 w-20 flex-shrink-0 text-xs pt-0.5">{label}</span>
      <span className={`font-medium text-xs leading-snug ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{children}</p>;
}

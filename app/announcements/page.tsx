'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Disclaimer from '@/components/Disclaimer';
import type { Announcement } from '@/types';

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

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [isMock, setIsMock] = useState(false);

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
            {isMock && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                샘플 데이터
              </span>
            )}
          </div>
        </div>

        {/* Region Filter */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">지역 필터</p>
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
        {isMock && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              현재 샘플 데이터를 표시하고 있습니다. 실제 공고는{' '}
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
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">해당 지역 공고가 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">다른 지역을 선택해 보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <AnnouncementCard key={item.id} announcement={item} />
            ))}
          </div>
        )}

        {/* Total count */}
        {!loading && announcements.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            총 {announcements.length}건의 공고
          </p>
        )}

        <Disclaimer />
      </div>
    </main>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const isUpcoming =
    announcement.subscriptionStartDate &&
    new Date(announcement.subscriptionStartDate) > new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-sm leading-snug flex-1">
            {announcement.complexName}
          </h3>
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
              isUpcoming
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isUpcoming ? '청약 예정' : '진행중/마감'}
          </span>
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

      {announcement.pdfUrl && (
        <div className="border-t border-gray-100 px-4 py-3">
          <a
            href={announcement.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
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

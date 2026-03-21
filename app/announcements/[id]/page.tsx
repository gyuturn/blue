'use client';

import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Disclaimer from '@/components/Disclaimer';
import type { Announcement, StoredScoreData } from '@/types';
import { getDday, getDdayBadgeStyle, getScoreTierLabel, getGeneralSupplyLabel, getSpecialSupplyLabels } from '@/lib/announcements';

export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const announcement = useMemo((): Announcement | null => {
    try {
      const stored = sessionStorage.getItem('selectedAnnouncement');
      if (!stored) return null;
      const parsed = JSON.parse(stored) as Announcement;
      return parsed.id === id ? parsed : null;
    } catch {
      return null;
    }
  }, [id]);

  const scoreData = useMemo((): StoredScoreData | null => {
    try {
      const stored = sessionStorage.getItem('scoreData');
      return stored ? (JSON.parse(stored) as StoredScoreData) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!announcement) {
      router.push('/announcements');
    }
  }, [announcement, router]);

  if (!announcement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dday = getDday(announcement.subscriptionStartDate, announcement.subscriptionEndDate);
  const ddayBadge = getDdayBadgeStyle(dday);
  const statusStyle =
    announcement.status === '접수중'
      ? 'bg-green-100 text-green-700'
      : announcement.status === '접수예정'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-500';

  const tierLabel = scoreData ? getScoreTierLabel(scoreData.result.tier) : null;
  const generalSupply = scoreData ? getGeneralSupplyLabel(scoreData.input) : null;
  const specialLabels = scoreData ? getSpecialSupplyLabels(scoreData.specialSupply, announcement.specialSupplyTypes) : [];
  const hasMatchInfo = tierLabel || generalSupply || specialLabels.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            공고 목록
          </button>

          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 leading-snug flex-1">
              {announcement.complexName}
            </h1>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {announcement.status && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyle}`}>
                  {announcement.status}
                </span>
              )}
              {dday && dday !== '마감' && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ddayBadge.className}`}>
                  {ddayBadge.label}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {announcement.builder} · {announcement.region} · {announcement.houseType}
          </p>
        </div>

        {/* 청약 일정 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-4">청약 일정</h2>
          <div className="space-y-3">
            {announcement.announcementDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">모집공고일</span>
                <span className="font-medium text-gray-800">{announcement.announcementDate}</span>
              </div>
            )}
            {announcement.subscriptionStartDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">접수 시작</span>
                <span className="font-medium text-gray-800">{announcement.subscriptionStartDate}</span>
              </div>
            )}
            {announcement.subscriptionEndDate && (
              <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-3">
                <span className="text-gray-500">접수 마감</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{announcement.subscriptionEndDate}</span>
                  {dday && dday !== '마감' && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ddayBadge.className}`}>
                      {ddayBadge.label}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 공급 정보 */}
        {announcement.totalHouseholds !== undefined && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">공급 정보</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">총 공급 세대수</span>
              <span className="font-bold text-gray-900">{announcement.totalHouseholds.toLocaleString()}세대</span>
            </div>
          </div>
        )}

        {/* 내 청약 분석 */}
        {scoreData && hasMatchInfo && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 mb-4">
            <h2 className="text-sm font-bold text-blue-800 mb-3">내 청약 분석</h2>
            <div className="flex flex-wrap gap-1.5">
              {tierLabel && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tierLabel.style}`}>
                  {tierLabel.text}
                </span>
              )}
              {generalSupply && !generalSupply.eligible && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-50 text-red-500">
                  {generalSupply.text}
                </span>
              )}
              {specialLabels.map((label) => (
                <span key={label} className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">
                  {label}
                </span>
              ))}
            </div>
            {scoreData && (
              <p className="text-xs text-blue-600 mt-2">
                내 가점 {scoreData.result.totalScore}점 / 84점 ({scoreData.result.tier}등급)
              </p>
            )}
          </div>
        )}

        {/* CTA 버튼 */}
        <div className="space-y-3 mb-6">
          {announcement.pdfUrl ? (
            <a
              href={announcement.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              원문 공고문 보기 (청약홈)
            </a>
          ) : (
            <button
              disabled
              className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-2xl font-semibold text-sm cursor-not-allowed"
            >
              공고문 없음
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="w-full py-3.5 border border-gray-200 text-gray-600 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>

        <Disclaimer />
      </div>
    </main>
  );
}

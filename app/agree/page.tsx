'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AgreePage() {
  const router = useRouter();
  const [allAgreed, setAllAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAllAgree = (checked: boolean) => {
    setAllAgreed(checked);
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
  };

  const handleIndividual = (type: 'terms' | 'privacy', checked: boolean) => {
    if (type === 'terms') setTermsAgreed(checked);
    if (type === 'privacy') setPrivacyAgreed(checked);
    setAllAgreed(checked && (type === 'terms' ? privacyAgreed : termsAgreed));
  };

  const canProceed = termsAgreed && privacyAgreed;

  const handleAgree = async () => {
    if (!canProceed || loading) return;
    setLoading(true);
    await fetch('/api/auth/agree?redirect=/', { method: 'POST' });
    router.replace('/');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">서비스 이용 동의</h1>
          <p className="text-sm text-gray-500 mt-1">청약 매칭 가이드를 이용하시려면<br />아래 약관에 동의해 주세요.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* 전체 동의 */}
          <label className="flex items-center gap-3 px-5 py-4 cursor-pointer bg-blue-50 border-b border-blue-100">
            <input
              type="checkbox"
              checked={allAgreed}
              onChange={(e) => handleAllAgree(e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded"
            />
            <span className="font-bold text-blue-700 text-sm">전체 동의</span>
          </label>

          {/* 이용약관 */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <label className="flex items-center gap-3 flex-1 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => handleIndividual('terms', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                <span className="text-blue-600 font-medium">[필수]</span> 이용약관 동의
              </span>
            </label>
            <Link href="/terms" target="_blank" className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">
              보기
            </Link>
          </div>

          {/* 개인정보 처리방침 */}
          <div className="flex items-center gap-3 px-5 py-4">
            <label className="flex items-center gap-3 flex-1 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => handleIndividual('privacy', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">
                <span className="text-blue-600 font-medium">[필수]</span> 개인정보 처리방침 동의
              </span>
            </label>
            <Link href="/privacy" target="_blank" className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">
              보기
            </Link>
          </div>
        </div>

        {/* 면책 안내 */}
        <p className="text-xs text-gray-400 text-center mb-6 px-2 leading-relaxed">
          본 서비스는 참고용 가이드이며 공식 청약 자격 판정이 아닙니다.<br />
          실제 청약은 청약홈에서 반드시 확인하세요.
        </p>

        {/* 동의 버튼 */}
        <button
          onClick={handleAgree}
          disabled={!canProceed || loading}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
            canProceed
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? '처리 중...' : '동의하고 시작하기'}
        </button>
      </div>
    </main>
  );
}

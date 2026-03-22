import Link from 'next/link';
import Disclaimer from '@/components/Disclaimer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            청약 매칭 가이드
          </h1>
          <p className="text-lg text-blue-600 font-medium mb-3">
            나에게 맞는 청약, 쉽게 찾아보세요
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            복잡한 청약 가점을 자동으로 계산하고,
            <br />
            내 상황에 맞는 청약 공고를 추천해 드립니다.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
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
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                5단계 자격 판정
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                간단한 정보 입력으로 청약 자격을 빠르게 확인하세요
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                가점 자동 계산
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                84점 만점 가점을 자동으로 계산하고 등급(S/A/B/C)을 알려드립니다
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                특별공급 자격 확인
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                신혼부부, 생애최초, 다자녀 특별공급 자격을 한눈에 확인하세요
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                청약 공고 큐레이션
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                최신 청약 공고를 지역별로 필터링하여 확인하세요
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/calculator"
            className="block w-full text-center py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors duration-200"
          >
            내 청약 가점 계산하기
          </Link>
          <Link
            href="/announcements"
            className="block w-full text-center py-3.5 bg-white hover:bg-gray-50 text-blue-600 font-semibold rounded-xl shadow-sm border border-blue-200 transition-colors duration-200"
          >
            청약 공고 보기
          </Link>
          <Link
            href="/guide"
            className="block w-full text-center py-3.5 bg-white hover:bg-gray-50 text-gray-600 font-semibold rounded-xl shadow-sm border border-gray-200 transition-colors duration-200"
          >
            청약 입문 가이드 보기
          </Link>
        </div>

        <Disclaimer />
      </div>
    </main>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보 처리방침 | 청약 매칭 가이드',
};

export default function PrivacyPage() {
  const lastUpdated = '2026년 4월 16일';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← 홈으로
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보 처리방침</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: {lastUpdated}</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">1. 개요</h2>
            <p>
              청약 매칭 가이드(이하 &quot;서비스&quot;)는 이용자의 개인정보를 소중히 여기며,
              「개인정보 보호법」 등 관련 법령을 준수합니다. 본 처리방침은 서비스가
              수집하는 개인정보의 항목, 수집 목적, 보유 기간 및 이용자의 권리에 대해
              안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">2. 수집하는 개인정보 항목</h2>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="font-semibold text-gray-800 mb-2">카카오 로그인 시 수집 (선택)</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>카카오 계정 고유 ID</li>
                  <li>닉네임</li>
                  <li>프로필 이미지 URL</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">* 로그인하지 않아도 서비스 이용 가능합니다.</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="font-semibold text-gray-800 mb-2">청약 가점 계산 시 수집 (선택, 로그인 이용자만 저장)</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>생년월일 (연·월)</li>
                  <li>혼인 여부 및 혼인 연월</li>
                  <li>무주택 기간, 부양가족 수, 미성년 자녀 수</li>
                  <li>청약통장 가입 시작일 및 납입 횟수</li>
                  <li>거주 지역</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">* 비로그인 시 기기 내 임시 저장 후 자동 삭제됩니다.</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="font-semibold text-gray-800 mb-2">즐겨찾기 이용 시 수집 (선택, 로그인 이용자만)</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>즐겨찾기한 청약 공고 정보 (단지명, 지역, 공고 번호)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">3. 수집 목적</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>청약 가점 계산 결과 저장 및 이력 관리</li>
              <li>맞춤 청약 공고 추천</li>
              <li>즐겨찾기 공고 저장</li>
              <li>서비스 품질 개선 및 통계 분석 (비식별 처리)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">4. 보유 및 이용 기간</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex gap-4 text-xs">
                <span className="text-gray-400 w-28 flex-shrink-0">계정 정보</span>
                <span className="text-gray-700">회원 탈퇴 시까지</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-400 w-28 flex-shrink-0">가점 계산 이력</span>
                <span className="text-gray-700">로그인 상태에서 저장된 경우, 회원 탈퇴 시까지</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-400 w-28 flex-shrink-0">즐겨찾기</span>
                <span className="text-gray-700">회원 탈퇴 또는 직접 삭제 시까지</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-400 w-28 flex-shrink-0">비로그인 임시 데이터</span>
                <span className="text-gray-700">브라우저 세션 종료 시 자동 삭제</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">5. 제3자 제공 및 위탁</h2>
            <p className="text-gray-600 mb-3">
              서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
              단, 아래 서비스에 처리를 위탁합니다.
            </p>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <div>
                <p className="font-medium text-gray-800 text-xs">Supabase (데이터베이스 저장)</p>
                <p className="text-gray-500 text-xs mt-0.5">가점 계산 이력 및 즐겨찾기 저장 · 미국 소재 서버</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 text-xs">Kakao (인증)</p>
                <p className="text-gray-500 text-xs mt-0.5">카카오 계정으로 로그인 시 인증 정보 처리</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">6. 이용자의 권리</h2>
            <p className="text-gray-600 mb-2">
              이용자는 언제든지 다음 권리를 행사할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>개인정보 열람 요청</li>
              <li>개인정보 수정·삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p className="text-gray-500 text-xs mt-3">
              권리 행사는 서비스 내 카카오 로그아웃 후 계정 삭제, 또는 아래 문의처로 연락해 주세요.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">7. 데이터 출처</h2>
            <p className="text-gray-600">
              청약 공고 정보는{' '}
              <a
                href="https://www.data.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                공공데이터포털
              </a>
              {' '}및 한국부동산원의 공공데이터를 기반으로 제공됩니다.
              데이터의 정확성은 원본 출처에 따르며, 서비스는 이를 보증하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">8. 문의</h2>
            <p className="text-gray-600">
              개인정보 관련 문의는 GitHub 이슈를 통해 접수해 주세요.
            </p>
            <a
              href="https://github.com/gyuturn/blue/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm underline"
            >
              github.com/gyuturn/blue/issues
            </a>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-600">이용약관</Link>
            <Link href="/" className="hover:text-gray-600">홈으로</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

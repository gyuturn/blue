import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 | 청약 매칭 가이드',
};

export default function TermsPage() {
  const lastUpdated = '2026년 4월 16일';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← 홈으로
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">이용약관</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: {lastUpdated}</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 청약 매칭 가이드(이하 &quot;서비스&quot;)의 이용 조건 및 절차,
              이용자와 서비스 제공자의 권리·의무에 관한 사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (서비스 내용)</h2>
            <p className="mb-2">서비스는 다음을 제공합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>청약 가점 자동 계산 (무주택 기간 / 부양가족 / 청약통장)</li>
              <li>특별공급 자격 판정 (신혼부부 / 생애최초 / 다자녀)</li>
              <li>최신 청약 공고 조회 및 지역 필터링</li>
              <li>청약 입문 가이드 콘텐츠</li>
            </ul>
            <p className="text-gray-500 text-xs mt-3">
              * 위 서비스는 참고용이며 법적 효력이 있는 공식 판정이 아닙니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (면책 조항)</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-yellow-800">⚠️ 중요 안내</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                <li>
                  본 서비스의 계산 결과는 <strong>참고용</strong>입니다.
                  실제 청약 자격 및 가점은 관련 법령, 사업 주체의 공고문,
                  한국부동산원 공식 기준에 따라 다를 수 있습니다.
                </li>
                <li>
                  청약 신청 전 반드시{' '}
                  <a
                    href="https://www.applyhome.co.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    청약홈(applyhome.co.kr)
                  </a>
                  {' '}및 모집공고문을 직접 확인하시기 바랍니다.
                </li>
                <li>
                  서비스 정보를 기반으로 한 청약 신청 결과에 대한 책임은
                  이용자 본인에게 있습니다.
                </li>
                <li>
                  공공데이터 API 장애, 청약홈 변경 등으로 인해 일부 정보가
                  부정확하거나 지연될 수 있습니다.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (이용자의 의무)</h2>
            <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>서비스 데이터·콘텐츠의 무단 수집·재배포·상업적 이용</li>
              <li>서비스 운영을 방해하는 자동화 요청(크롤링, 봇 등)</li>
              <li>타인의 개인정보를 이용한 서비스 이용</li>
              <li>관련 법령을 위반하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (서비스 변경 및 중단)</h2>
            <p className="text-gray-600">
              서비스는 운영 상 필요에 따라 사전 고지 없이 서비스 내용을 변경하거나
              일시 중단할 수 있습니다. 서비스 중단으로 인한 손해에 대해 서비스는
              고의 또는 중과실이 없는 한 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (준거법 및 분쟁 해결)</h2>
            <p className="text-gray-600">
              본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련한 분쟁은
              관련 법령에 따른 절차에 의해 해결합니다.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600">개인정보 처리방침</Link>
            <Link href="/" className="hover:text-gray-600">홈으로</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

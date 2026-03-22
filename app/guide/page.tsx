import Link from 'next/link';
import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';

export const metadata: Metadata = {
  title: '청약 입문 가이드 | 청약블루',
  description: '청약이란 무엇인지, 어떻게 신청하는지 처음부터 알기 쉽게 안내합니다.',
};

const GLOSSARY = [
  { term: '무주택', definition: '세대원 전원이 현재 주택을 소유하지 않은 상태. 청약 가점의 핵심 기준이며 무주택 기간이 길수록 높은 점수를 받습니다.' },
  { term: '부양가족', definition: '주민등록상 같은 세대에 등록된 배우자, 직계존속(부모·조부모), 직계비속(자녀·손자녀). 부양가족이 많을수록 가점이 높아집니다.' },
  { term: '가점제', definition: '무주택기간·부양가족 수·청약통장 가입기간의 점수 합산으로 당첨자를 선정하는 방식. 주로 전용면적 85㎡ 이하 민영주택에 적용됩니다.' },
  { term: '추첨제', definition: '가점과 무관하게 무작위 추첨으로 당첨자를 선정하는 방식. 가점이 낮아도 당첨 기회가 있습니다.' },
  { term: '전용면적', definition: '실제 거주에 사용되는 전용 공간의 면적. 베란다·복도·계단 등 공용 공간은 제외됩니다. 아파트 크기 표기의 기준이 됩니다.' },
  { term: '공급면적', definition: '전용면적에 주거공용면적(계단·복도·엘리베이터 등)을 더한 면적. 옛 표기인 "평수"의 기준이 됩니다.' },
  { term: '분양가', definition: '청약 당첨 시 해당 주택을 구입하기 위해 납부해야 하는 공급 가격. 주변 시세 대비 저렴한 경우가 많아 청약의 핵심 장점입니다.' },
  { term: '청약가점', definition: '무주택기간(최대 32점), 부양가족 수(최대 35점), 청약통장 가입기간(최대 17점)을 합산한 점수. 만점은 84점입니다.' },
  { term: '특별공급', definition: '신혼부부·생애최초·다자녀 등 정책적 배려가 필요한 계층에게 일반 청약과 별도로 물량을 공급하는 제도.' },
  { term: '일반공급', definition: '특별공급을 제외한 일반 청약자를 대상으로 가점제 또는 추첨제로 당첨자를 선정하는 공급 방식.' },
];

const SPECIAL_SUPPLY_TYPES = [
  {
    type: '신혼부부',
    color: 'bg-pink-50 border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    qualifications: ['혼인 후 7년 이내', '무주택 세대구성원', '소득 기준 충족'],
  },
  {
    type: '생애최초',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    qualifications: ['생애 처음으로 주택 구입', '청약통장 납입 12회 이상', '근로자·자영업자(소득세 납부 이력)'],
  },
  {
    type: '다자녀',
    color: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    qualifications: ['미성년 자녀 3명 이상', '무주택 세대구성원'],
  },
  {
    type: '노부모 부양',
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    qualifications: ['만 65세 이상 직계존속 부양', '3년 이상 동일 세대 등록', '무주택 세대구성원'],
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">청약 입문 가이드</h1>
              <p className="text-sm text-gray-500">청약을 처음 접하는 분들을 위한 기초 안내</p>
            </div>
          </div>
        </div>

        {/* 섹션 1: 청약이란? */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">📌 청약이란?</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            청약이란 새로 짓는 아파트를 분양받기 위해 사전 신청하는 제도입니다. 정부·건설사가 공급하는 주택을 시세보다 저렴하게 구입할 수 있어, 내 집 마련의 가장 보편적인 방법으로 꼽힙니다.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            당첨은 가점(무주택기간, 부양가족, 청약통장 납입기간)이나 추첨으로 결정됩니다. 청약통장을 일찍 만들고 꾸준히 납입할수록 유리합니다.
          </p>
        </section>

        {/* 섹션 2: 청약통장 종류 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🏦 청약통장 종류</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">종류</th>
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">가입 대상</th>
                  <th className="text-left font-semibold text-gray-700 pb-2">특징</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-blue-700">주택청약종합저축</td>
                  <td className="py-2.5 pr-4 text-gray-600">누구나</td>
                  <td className="py-2.5 text-gray-600">공공+민영 모두 청약 가능. 현재 주력 상품</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-gray-600">청약저축</td>
                  <td className="py-2.5 pr-4 text-gray-600">무주택 세대주</td>
                  <td className="py-2.5 text-gray-500">공공주택 전용, 신규 가입 불가</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-gray-600">청약예금·부금</td>
                  <td className="py-2.5 pr-4 text-gray-600">누구나</td>
                  <td className="py-2.5 text-gray-500">민영주택 전용, 신규 가입 불가</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">* 지금 통장이 없다면 주택청약종합저축을 개설하세요.</p>
        </section>

        {/* 섹션 3: 청약 신청 절차 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 청약 신청 절차</h2>
          <div className="space-y-3">
            {[
              { step: 1, title: '청약통장 개설', desc: '주택청약종합저축에 가입하고 매달 꾸준히 납입합니다. 가입 기간과 납입 횟수가 가점에 반영됩니다.', color: 'bg-blue-600' },
              { step: 2, title: '가점 확인', desc: '청약블루 계산기로 무주택기간·부양가족·통장 가입기간을 입력해 현재 가점을 확인합니다.', color: 'bg-blue-600' },
              { step: 3, title: '공고 확인', desc: '청약홈(applyhome.co.kr)에서 관심 지역의 분양 공고를 확인하고 자격 요건을 검토합니다.', color: 'bg-blue-600' },
              { step: 4, title: '청약 신청', desc: '청약홈 또는 해당 은행 앱에서 온라인으로 신청합니다. 공고문의 청약 일정을 반드시 확인하세요.', color: 'bg-blue-600' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className={`flex-shrink-0 w-7 h-7 ${item.color} text-white rounded-full flex items-center justify-center text-xs font-bold`}>
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 4: 특별공급 유형 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⭐ 특별공급 유형</h2>
          <p className="text-sm text-gray-500 mb-4">일반 청약보다 경쟁이 낮은 경우가 많습니다. 해당되는지 확인해 보세요.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SPECIAL_SUPPLY_TYPES.map((item) => (
              <div key={item.type} className={`rounded-xl border p-4 ${item.color}`}>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${item.badge}`}>
                  {item.type}
                </span>
                <ul className="space-y-1">
                  {item.qualifications.map((q) => (
                    <li key={q} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 5: 주요 용어 사전 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📖 주요 용어 사전</h2>
          <p className="text-sm text-gray-500 mb-4">용어를 클릭하면 설명을 볼 수 있습니다.</p>
          <Accordion items={GLOSSARY} />
        </section>

        {/* 하단 CTA */}
        <div className="space-y-3 mb-6">
          <Link
            href="/calculator"
            className="block w-full text-center py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors"
          >
            내 청약 가점 계산하기 →
          </Link>
          <Link
            href="/announcements"
            className="block w-full text-center py-3.5 bg-white hover:bg-gray-50 text-blue-600 font-semibold rounded-xl shadow-sm border border-blue-200 transition-colors"
          >
            청약 공고 보기
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center">
          본 가이드는 참고용이며 정확한 자격 요건은 공고문을 확인하세요.
        </p>
      </div>
    </main>
  );
}

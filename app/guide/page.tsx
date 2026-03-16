import type { Metadata } from 'next';
import Link from 'next/link';
import { TERMS } from '@/lib/terms';
import GuideAccordion from '@/components/GuideAccordion';
import type { FAQItem } from '@/components/GuideAccordion';

export const metadata: Metadata = {
  title: '청약 완전 정복 가이드 | 청약 매칭 가이드',
  description: '청약 입문자를 위한 쉬운 청약 개념 정리와 절차 안내',
};

const FAQ_ITEMS: FAQItem[] = [
  {
    q: '청약통장은 어디서 만들 수 있나요?',
    a: '전국 모든 시중 은행(국민, 신한, 우리, 하나 등)에서 개설할 수 있습니다. 주택청약종합저축 계좌를 개설하면 되며, 만 19세 이상이면 누구나 가입 가능합니다. 미성년자(만 17세 이상)도 청약 저축에 가입할 수 있습니다.',
  },
  {
    q: '청약통장에 매달 얼마씩 넣어야 하나요?',
    a: '월 2만 원~50만 원 사이에서 자유롭게 선택할 수 있습니다. 국민주택(공공분양)을 목표로 한다면 매월 10만 원씩 꾸준히 납입하는 것이 유리합니다. 민영주택은 납입 횟수보다 예치금 잔액이 중요하므로, 목표 금액만 채워두면 됩니다.',
  },
  {
    q: '1순위와 2순위의 차이가 뭔가요?',
    a: '1순위는 청약통장 가입 기간과 납입 횟수 조건을 충족한 사람이고, 2순위는 그 조건을 충족하지 못한 사람입니다. 1순위 중에서 먼저 당첨자를 뽑고, 미달 시에만 2순위에게 기회가 돌아갑니다. 경쟁이 치열한 단지는 사실상 1순위에서 마감됩니다.',
  },
  {
    q: '특별공급과 일반공급 중 뭐가 더 유리한가요?',
    a: '자격이 된다면 특별공급이 훨씬 유리합니다. 특별공급은 일반공급과 별도의 물량이 배정되어 경쟁률이 낮은 경우가 많습니다. 신혼부부, 생애최초, 다자녀 등 해당 조건을 충족하면 반드시 특별공급에 먼저 도전하세요.',
  },
  {
    q: '가점이 낮으면 청약에 당첨될 수 없나요?',
    a: '그렇지 않습니다. 전용면적 85m² 초과 주택은 추첨제로 선정되므로 가점이 낮아도 당첨될 수 있습니다. 또한 비규제지역에서는 85m² 이하 주택도 일정 비율을 추첨제로 배정합니다. 미달 단지를 노리는 것도 좋은 전략입니다.',
  },
  {
    q: '청약에 당첨되면 바로 입주하나요?',
    a: '아닙니다. 청약 당첨 후 계약을 체결하면, 보통 2~3년 뒤에 입주합니다. 그 사이에 계약금(분양가의 10~20%), 중도금(40~60%), 잔금(나머지)을 순차적으로 납부합니다. 중도금 대출을 활용하는 경우가 많습니다.',
  },
  {
    q: '부적격 당첨이란 무엇인가요?',
    a: '자격 요건을 갖추지 못한 상태에서 청약에 당첨된 경우를 말합니다. 부적격 판정을 받으면 당첨이 취소되고, 향후 일정 기간(보통 1년) 동안 청약 신청이 제한됩니다. 반드시 모집공고의 자격 요건을 꼼꼼히 확인하세요.',
  },
  {
    q: '청약 당첨 후 포기하면 어떤 불이익이 있나요?',
    a: '당첨 후 계약을 포기하면 재당첨 제한(투기과열지구 10년, 조정대상지역 7년, 그 외 지역 없음)이 적용될 수 있습니다. 다만, 계약 체결 전에 포기하는 경우와 후에 포기하는 경우에 따라 제한 기간이 달라질 수 있으니 공고문을 확인하세요.',
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-blue-200 text-sm font-medium mb-3">
            청약 매칭 가이드
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-4">
            청약, 처음이세요?
          </h1>
          <p className="text-blue-100 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-8">
            복잡하게만 느껴지는 청약, 이 가이드 하나면 충분합니다.
            <br />
            용어부터 절차까지, 쉽고 빠르게 이해해 보세요.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/15 backdrop-blur rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-black">84점</p>
              <p className="text-xs text-blue-200 mt-1">가점제 만점</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-black">6종</p>
              <p className="text-xs text-blue-200 mt-1">특별공급 유형</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-black">5단계</p>
              <p className="text-xs text-blue-200 mt-1">청약 절차</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">
        {/* Section 1: 청약이란? */}
        <section>
          <SectionTitle number={1} title="청약이란?" />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-gray-700 leading-relaxed mb-6">
              <strong>청약</strong>이란 새로 짓는 아파트(신축 분양)를 사전에 신청하여 구입하는 제도입니다.
              쉽게 말해, <strong>&ldquo;새 아파트 추첨 응모&rdquo;</strong>라고 생각하시면 됩니다.
              정부가 운영하는 공정한 시스템을 통해 누구나 내 집 마련의 기회를 얻을 수 있습니다.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-5">
                <h4 className="font-bold text-blue-800 mb-2">국민주택 (공공분양)</h4>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>- 전용면적 85m² 이하</li>
                  <li>- 국가·지자체·LH 등이 공급</li>
                  <li>- 납입 횟수·가입 기간이 핵심</li>
                  <li>- 상대적으로 저렴한 분양가</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-xl p-5">
                <h4 className="font-bold text-purple-800 mb-2">민영주택 (민간분양)</h4>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>- 면적 제한 없음</li>
                  <li>- 민간 건설사가 공급</li>
                  <li>- 예치금(잔액)이 핵심</li>
                  <li>- 가점제 or 추첨제로 선정</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: 청약 절차 */}
        <section>
          <SectionTitle number={2} title="청약 절차" />
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: '청약통장 개설',
                desc: '은행에서 주택청약종합저축 계좌를 개설하고 매월 납입을 시작합니다.',
                color: 'bg-blue-500',
              },
              {
                step: 2,
                title: '자격 확인',
                desc: '무주택 여부, 청약통장 가입 기간, 납입 횟수, 예치금 잔액 등을 확인합니다.',
                color: 'bg-cyan-500',
              },
              {
                step: 3,
                title: '모집공고 확인',
                desc: '청약홈에서 원하는 단지의 모집공고를 꼼꼼히 읽고 자격 요건을 체크합니다.',
                color: 'bg-teal-500',
              },
              {
                step: 4,
                title: '청약 신청',
                desc: '청약홈(applyhome.co.kr)에서 온라인으로 청약을 접수합니다.',
                color: 'bg-green-500',
              },
              {
                step: 5,
                title: '당첨 발표 및 계약',
                desc: '당첨자 발표 후 서류 제출, 자격 검증을 거쳐 분양 계약을 체결합니다.',
                color: 'bg-emerald-500',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 items-start bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 ${item.color} text-white rounded-full flex items-center justify-center font-bold text-sm`}
                >
                  {item.step}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: 자격 요건 */}
        <section>
          <SectionTitle number={3} title="자격 요건" />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">무주택 조건</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                본인과 세대 구성원 모두 주택을 소유하지 않아야 합니다. 무주택 기간이 길수록 가점이 높아집니다.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">청약통장 조건</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                청약통장 가입 기간(보통 1~2년), 납입 횟수(12~24회), 예치금 잔액 등의 조건을 충족해야 합니다.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">거주지 조건</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                해당 주택 소재지 또는 인접 지역에 거주해야 합니다. 규제지역은 더 긴 거주 기간이 요구됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: 가점제 이해하기 */}
        <section>
          <SectionTitle number={4} title="가점제 이해하기" />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-gray-600 text-sm mb-6">
              가점제는 총 <strong className="text-blue-700">84점 만점</strong>으로, 아래 3가지 항목의 점수를 합산하여 높은 순서대로 당첨자를 선정합니다.
            </p>
            <div className="space-y-4">
              <ScoreCategory
                title="무주택 기간"
                maxPoints={32}
                color="bg-red-500"
                details="만 30세부터 산정, 1년 미만 2점 / 이후 1년당 2점씩 증가 / 15년 이상 최대 32점"
              />
              <ScoreCategory
                title="부양가족 수"
                maxPoints={35}
                color="bg-blue-500"
                details="0명 5점 / 1명 10점 / 2명 15점 / 3명 20점 / 4명 25점 / 5명 30점 / 6명 이상 35점"
              />
              <ScoreCategory
                title="청약통장 가입 기간"
                maxPoints={17}
                color="bg-green-500"
                details="6개월 미만 1점 / 이후 6개월당 1점씩 증가 / 15년 이상 최대 17점"
              />
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">
                <strong>Tip:</strong> 부양가족 수(35점)가 가장 큰 비중을 차지합니다.
                부양가족이 적다면 추첨제나 특별공급을 적극 활용하는 것이 전략적입니다.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: 특별공급 종류 */}
        <section>
          <SectionTitle number={5} title="특별공급 종류" />
          <div className="grid md:grid-cols-2 gap-4">
            <SpecialSupplyCard
              title="신혼부부 특별공급"
              emoji="heart"
              color="bg-pink-50 border-pink-200"
              headerColor="text-pink-700"
              conditions={[
                '혼인 기간 7년 이내',
                '무주택 세대 구성원',
                '소득 기준 충족 (도시근로자 평균 130% 이하)',
                '자녀가 있으면 가점 우대',
              ]}
            />
            <SpecialSupplyCard
              title="생애최초 특별공급"
              emoji="star"
              color="bg-yellow-50 border-yellow-200"
              headerColor="text-yellow-700"
              conditions={[
                '생애 최초 주택 구입자',
                '5년 이상 소득세 납부',
                '청약통장 납입 12회 이상',
                '무주택 세대 구성원',
              ]}
            />
            <SpecialSupplyCard
              title="다자녀 특별공급"
              emoji="family"
              color="bg-green-50 border-green-200"
              headerColor="text-green-700"
              conditions={[
                '미성년 자녀 3명 이상',
                '무주택 세대 구성원',
                '자녀 수에 따라 가점 부여',
                '청약통장 6개월 이상 가입',
              ]}
            />
            <SpecialSupplyCard
              title="노부모부양 특별공급"
              emoji="elder"
              color="bg-indigo-50 border-indigo-200"
              headerColor="text-indigo-700"
              conditions={[
                '만 65세 이상 직계존속 3년 이상 부양',
                '무주택 세대주',
                '피부양자와 같은 세대',
                '가점제 상위자 우선 선정',
              ]}
            />
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section>
          <SectionTitle number={6} title="자주 묻는 질문" />
          <GuideAccordion items={FAQ_ITEMS} />
        </section>

        {/* Section 7: 용어사전 */}
        <section>
          <SectionTitle number={7} title="청약 용어사전" />
          <div className="grid sm:grid-cols-2 gap-3">
            {TERMS.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-900 text-sm">{t.term}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{t.fullDef}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
            <h2 className="text-xl font-bold mb-2">이제 직접 확인해 볼까요?</h2>
            <p className="text-blue-100 text-sm mb-6">
              내 상황에 맞는 청약 가점과 자격을 바로 계산해 보세요
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/calculator"
                className="inline-block px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-md"
              >
                가점 계산하기
              </Link>
              <Link
                href="/announcements"
                className="inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-400 transition-colors border border-blue-400"
              >
                공고 보러 가기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
        {number}
      </span>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

function ScoreCategory({
  title,
  maxPoints,
  color,
  details,
}: {
  title: string;
  maxPoints: number;
  color: string;
  details: string;
}) {
  const percentage = (maxPoints / 84) * 100;
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <span className="text-sm font-bold text-blue-600">최대 {maxPoints}점</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{details}</p>
    </div>
  );
}

function SpecialSupplyCard({
  title,
  color,
  headerColor,
  conditions,
}: {
  title: string;
  emoji: string;
  color: string;
  headerColor: string;
  conditions: string[];
}) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <h4 className={`font-bold mb-3 ${headerColor}`}>{title}</h4>
      <ul className="space-y-1.5">
        {conditions.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from 'next/link';
import Disclaimer from '@/components/Disclaimer';
import LastScoreCard from '@/components/home/LastScoreCard';
import { getSession } from '@/lib/auth/session';
import { db, describeDbError } from '@/lib/db';
import { subscriptionScores } from '@/lib/db/schema';
import { isEligibilityInput } from '@/lib/scoreStorage';
import { eq, desc } from 'drizzle-orm';
import type { EligibilityInput } from '@/types';

type ServerRecordResult =
  | { ok: true; record: { input: EligibilityInput; savedAt: number } | null }
  | { ok: false };

async function getLatestServerRecord(userId: string): Promise<ServerRecordResult> {
  try {
    const [latest] = await db
      .select()
      .from(subscriptionScores)
      .where(eq(subscriptionScores.userId, userId))
      .orderBy(desc(subscriptionScores.createdAt))
      .limit(1);
    if (!latest || !isEligibilityInput(latest.inputSnapshot)) return { ok: true, record: null };
    return { ok: true, record: { input: latest.inputSnapshot, savedAt: new Date(latest.createdAt).getTime() } };
  } catch (err) {
    // 조회 실패를 "기록 없음"으로 취급하면 저장 제안이 떠서 실패가 뻔한 버튼을 누르게 된다
    console.error('[db] home latest score failed:', describeDbError(err));
    return { ok: false };
  }
}

const STEPS = [
  { title: '집이 있는지', max: 32, description: '집 없이 지낸 기간이 길수록 점수가 올라요' },
  { title: '함께 사는 가족', max: 35, description: '가족이 많을수록 점수가 올라요' },
  { title: '청약통장', max: 17, description: '통장을 오래 가지고 있을수록 점수가 올라요' },
];

const LINKS = [
  { href: '/announcements', title: '청약 공고 보기', description: '지금 신청할 수 있는 아파트를 지역별로 모았어요' },
  { href: '/guide', title: '청약이 처음이라면', description: '용어부터 신청 순서까지 쉽게 알려드려요' },
];

export default async function HomePage() {
  const session = await getSession();
  const server = session ? await getLatestServerRecord(session.id) : null;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-5 pt-8">
        <LastScoreCard
          isLoggedIn={!!session}
          serverRecord={server?.ok ? server.record : null}
          serverAvailable={server?.ok ?? false}
        />

        <section className="pt-4 pb-10">
          <p className="text-sm font-semibold text-blue-600">청약 가점 계산기</p>
          <h1 className="mt-2 text-[30px] font-bold leading-tight text-gray-900">
            내 청약 점수,
            <br />
            1분이면 알 수 있어요
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-500">
            어려운 용어 몰라도 괜찮아요.
            <br />
            질문에 답하기만 하면 돼요.
          </p>
        </section>

        <section className="rounded-3xl bg-gray-50 p-6">
          <h2 className="text-base font-bold text-gray-900">이렇게 계산해요</h2>
          <ol className="mt-5 space-y-5">
            {STEPS.map((item, i) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">
                    {item.title}
                    <span className="ml-1.5 text-sm font-normal text-gray-400">최대 {item.max}점</span>
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
            세 가지를 더하면 <strong className="text-gray-900">84점 만점</strong>이에요. 점수가 높을수록 당첨에 유리해요.
          </p>
        </section>

        <nav className="mt-8 divide-y divide-gray-100">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="flex items-center justify-between py-4 group">
              <span>
                <span className="block text-[15px] font-semibold text-gray-900">{link.title}</span>
                <span className="block text-sm text-gray-500 mt-0.5">{link.description}</span>
              </span>
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </nav>

        <Disclaimer />
        <div className="h-36" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white pt-3">
        <div className="max-w-md mx-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href="/calculator"
            className="block w-full rounded-2xl bg-blue-600 py-4 text-center text-base font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.99]"
          >
            내 점수 알아보기
          </Link>
          <p className="mt-2 text-center text-xs text-gray-400">로그인 없이 바로 시작해요</p>
        </div>
      </div>
    </main>
  );
}

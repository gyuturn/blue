import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import WithdrawForm from '@/components/auth/WithdrawForm';

export const metadata: Metadata = {
  title: '회원탈퇴 | 청약블루',
  robots: { index: false },
};

export default async function WithdrawPage() {
  const user = await getSession();
  if (!user) redirect('/');

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <WithdrawForm nickname={user.nickname} />
      </div>
    </main>
  );
}

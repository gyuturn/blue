import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import KakaoLoginButton from '@/components/auth/KakaoLoginButton';
import UserProfileDropdown from '@/components/auth/UserProfileDropdown';

export default async function Header() {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4">
        <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-bold text-blue-600">
          청약블루
        </Link>

        <nav className="flex items-center gap-3 whitespace-nowrap sm:gap-6">
          <Link href="/guide" className="text-[13px] text-gray-600 sm:text-sm hover:text-gray-900 transition-colors">
            가이드
          </Link>
          <Link href="/announcements" className="text-[13px] text-gray-600 sm:text-sm hover:text-gray-900 transition-colors">
            공고목록
          </Link>
          <Link href="/calculator" className="text-[13px] text-gray-600 sm:text-sm hover:text-gray-900 transition-colors">
            점수 계산
          </Link>
        </nav>

        <div className="shrink-0">
          {user ? (
            <UserProfileDropdown user={user} />
          ) : (
            <KakaoLoginButton />
          )}
        </div>
      </div>
    </header>
  );
}

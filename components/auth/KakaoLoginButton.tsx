'use client';

// 로그인은 선택 기능(다른 기기에서도 점수 보기)이라 헤더에서는 눈에 덜 띄게 둔다
export default function KakaoLoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/kakao';
  };

  return (
    <button
      onClick={handleLogin}
      title="카카오로 로그인하면 다른 기기에서도 내 점수를 볼 수 있어요"
      className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      로그인
    </button>
  );
}

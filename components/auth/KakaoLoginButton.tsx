'use client';

export default function KakaoLoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/kakao';
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90 active:opacity-80"
      style={{ backgroundColor: '#FEE500', color: '#3C1E1E' }}
    >
      <KakaoIcon />
      카카오로 로그인
    </button>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.376c0 2.072 1.38 3.893 3.462 4.94l-.882 3.29a.188.188 0 0 0 .287.203l4.03-2.666c.194.014.39.021.587.021 4.142 0 7.5-2.633 7.5-5.876C16.5 4.134 13.142 1.5 9 1.5Z"
        fill="#3C1E1E"
      />
    </svg>
  );
}

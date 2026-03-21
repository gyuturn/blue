export interface KakaoUser {
  id: number;
  kakao_account?: {
    profile?: {
      nickname: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    email?: string;
  };
}

export interface SessionUser {
  id: string;
  nickname: string;
  profileImage: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (초)
}

export interface KakaoTokenResponse {
  access_token: string;
  refresh_token?: string;       // 카카오는 rotation 시에만 포함
  expires_in: number;
  refresh_token_expires_in?: number;
}
